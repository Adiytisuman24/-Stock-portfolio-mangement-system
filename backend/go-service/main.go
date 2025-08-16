package main

import (
  "database/sql"
  "encoding/json"
  "log"
  "net/http"
  "os"
  "time"
  "strings"
  "strconv"

  "github.com/golang-jwt/jwt/v5"
  "github.com/gorilla/mux"
  "github.com/lib/pq"
  "golang.org/x/crypto/bcrypt"
)

type App struct{ db *sql.DB; jwtSecret []byte }

type User struct {
  ID    int    `json:"id"`
  Email string `json:"email"`
  Role  string `json:"role"`
}

type UserPreferences struct {
  PreferredMarkets      []string `json:"preferred_markets"`
  Watchlist            []string `json:"watchlist"`
  OnboardingCompleted  bool     `json:"onboarding_completed"`
}

func main(){
  dsn := "host="+env("DB_HOST","postgres")+" port="+env("DB_PORT","5432")+" user="+env("DB_USER","admin")+" password="+env("DB_PASSWORD","adminpassword")+" dbname="+env("DB_NAME","stocks")+" sslmode=disable"
  db, err := sql.Open("postgres", dsn); must(err)
  must(db.Ping())
  app := &App{db: db, jwtSecret: []byte(env("JWT_SECRET","secret"))}

  r := mux.NewRouter()
  r.HandleFunc("/healthz", app.health).Methods("GET")
  r.HandleFunc("/auth/register", app.register).Methods("POST")
  r.HandleFunc("/auth/login", app.login).Methods("POST")
  r.HandleFunc("/auth/me", app.auth(app.getMe)).Methods("GET")
  r.HandleFunc("/stocks", app.auth(app.listLatest)).Methods("GET")
  r.HandleFunc("/stocks/{symbol}", app.auth(app.history)).Methods("GET")
  r.HandleFunc("/portfolio", app.auth(app.getPortfolio)).Methods("GET")
  r.HandleFunc("/portfolio", app.auth(app.upsertPortfolio)).Methods("POST")
  r.HandleFunc("/preferences", app.auth(app.getPreferences)).Methods("GET")
  r.HandleFunc("/preferences", app.auth(app.updatePreferences)).Methods("POST")
  
  // Admin routes
  r.HandleFunc("/admin/users", app.auth(app.adminOnly(app.getAllUsers))).Methods("GET")
  r.HandleFunc("/admin/portfolios", app.auth(app.adminOnly(app.getAllPortfolios))).Methods("GET")
  r.HandleFunc("/admin/users/{id}/portfolio", app.auth(app.adminOnly(app.getUserPortfolio))).Methods("GET")

  log.Println("go-service :8080"); log.Fatal(http.ListenAndServe(":8080", cors(r)))
}

func env(k, d string) string { if v:=os.Getenv(k); v!="" {return v}; return d }
func must(e error){ if e!=nil { log.Fatal(e) } }

func cors(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
    w.Header().Set("Access-Control-Allow-Origin","*")
    w.Header().Set("Access-Control-Allow-Headers","Authorization, Content-Type")
    w.Header().Set("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS")
    if r.Method=="OPTIONS" { w.WriteHeader(204); return }
    next.ServeHTTP(w,r)
  })
}

func (a *App) health(w http.ResponseWriter,_ *http.Request){ w.Write([]byte(`{"ok":true}`)) }

type creds struct{ Email, Password string }
func (a *App) register(w http.ResponseWriter, r *http.Request){
  var c creds; json.NewDecoder(r.Body).Decode(&c)
  if c.Email==""||c.Password==""{ http.Error(w,"bad input",400); return }
  hash,_ := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
  
  var userID int
  err := a.db.QueryRow("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'user') RETURNING id", 
    c.Email, string(hash)).Scan(&userID)
  if err!=nil { 
    if strings.Contains(err.Error(), "duplicate key") {
      http.Error(w,"email already exists",409); return
    }
    http.Error(w,err.Error(),500); return 
  }
  
  // Create default preferences
  _, err = a.db.Exec("INSERT INTO user_preferences(user_id) VALUES($1)", userID)
  if err != nil { log.Printf("Failed to create preferences for user %d: %v", userID, err) }
  
  w.WriteHeader(201); w.Write([]byte(`{"ok":true,"user_id":`+strconv.Itoa(userID)+`}`))
}

func (a *App) login(w http.ResponseWriter, r *http.Request){
  var c creds; json.NewDecoder(r.Body).Decode(&c)
  var id int; var hash, role string
  err := a.db.QueryRow("SELECT id,password_hash,role FROM users WHERE email=$1", c.Email).Scan(&id,&hash,&role)
  if err!=nil { http.Error(w,"invalid credentials",401); return }
  if bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password))!=nil { http.Error(w,"invalid credentials",401); return }
  
  tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
    "sub": id, 
    "email": c.Email,
    "role": role,
    "exp": time.Now().Add(24*time.Hour).Unix(),
  })
  s, _ := tok.SignedString(a.jwtSecret)
  json.NewEncoder(w).Encode(map[string]any{"token":s,"user":map[string]any{"id":id,"email":c.Email,"role":role}})
}

func (a *App) getMe(w http.ResponseWriter, r *http.Request){
  user := getUserFromContext(r)
  json.NewEncoder(w).Encode(user)
}

func (a *App) auth(next http.HandlerFunc) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request){
    ah := r.Header.Get("Authorization")
    if !strings.HasPrefix(ah,"Bearer ") { http.Error(w,"unauthorized",401); return }
    token := strings.TrimPrefix(ah,"Bearer ")
    t, err := jwt.Parse(token, func(t *jwt.Token)(interface{}, error){ return a.jwtSecret, nil })
    if err!=nil || !t.Valid { http.Error(w,"unauthorized",401); return }
    
    if claims, ok := t.Claims.(jwt.MapClaims); ok {
      // Add user info to request context (simplified approach)
      r.Header.Set("X-User-ID", strconv.Itoa(int(claims["sub"].(float64))))
      r.Header.Set("X-User-Email", claims["email"].(string))
      r.Header.Set("X-User-Role", claims["role"].(string))
    }
    
    next.ServeHTTP(w,r)
  }
}

func (a *App) adminOnly(next http.HandlerFunc) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request){
    role := r.Header.Get("X-User-Role")
    if role != "admin" { http.Error(w,"forbidden - admin access required",403); return }
    next.ServeHTTP(w,r)
  }
}

func (a *App) listLatest(w http.ResponseWriter, r *http.Request){
  rows, err := a.db.Query(`SELECT DISTINCT ON(symbol) symbol, ts, close, volume FROM stock_prices ORDER BY symbol, ts DESC`)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next(){
    var s string; var ts time.Time; var c sql.NullFloat64; var v sql.NullInt64
    rows.Scan(&s,&ts,&c,&v)
    out = append(out, map[string]any{"symbol":s,"ts":ts,"close":nullf(c),"volume":nulli(v)})
  }
  json.NewEncoder(w).Encode(out)
}

func (a *App) history(w http.ResponseWriter, r *http.Request){
  sym := mux.Vars(r)["symbol"]
  rows, err := a.db.Query(`SELECT ts, open, high, low, close, volume FROM stock_prices WHERE symbol=$1 ORDER BY ts DESC LIMIT 300`, sym)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next(){
    var ts time.Time; var o,h,l,c sql.NullFloat64; var v sql.NullInt64
    rows.Scan(&ts,&o,&h,&l,&c,&v)
    out = append(out, map[string]any{"ts":ts,"open":nullf(o),"high":nullf(h),"low":nullf(l),"close":nullf(c),"volume":nulli(v)})
  }
  json.NewEncoder(w).Encode(out)
}

type portReq struct{ Symbol string; Quantity float64; AvgBuyPrice float64 }
func (a *App) upsertPortfolio(w http.ResponseWriter, r *http.Request){
  u := getUserID(r); var pr portReq; json.NewDecoder(r.Body).Decode(&pr)
  if pr.Symbol=="" { http.Error(w,"symbol required",400); return }
  
  _, err := a.db.Exec(`INSERT INTO portfolios(user_id,symbol,quantity,avg_buy_price,last_updated) 
    VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(user_id,symbol) DO UPDATE SET 
    quantity=EXCLUDED.quantity, avg_buy_price=EXCLUDED.avg_buy_price, last_updated=NOW()`, 
    u, strings.ToUpper(pr.Symbol), pr.Quantity, pr.AvgBuyPrice)
  if err!=nil { http.Error(w,err.Error(),500); return }
  w.Write([]byte(`{"ok":true}`))
}

func (a *App) getPortfolio(w http.ResponseWriter, r *http.Request){
  u := getUserID(r)
  rows, err := a.db.Query(`SELECT p.symbol, p.quantity, p.avg_buy_price, sp.close FROM portfolios p
    LEFT JOIN LATERAL (
      SELECT close FROM stock_prices WHERE symbol=p.symbol ORDER BY ts DESC LIMIT 1
    ) sp ON true WHERE p.user_id=$1 ORDER BY p.symbol`, u)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next(){ 
    var s string; var q, avg sql.NullFloat64; var c sql.NullFloat64
    rows.Scan(&s,&q,&avg,&c)
    out = append(out, map[string]any{
      "symbol":s,
      "quantity":nullf(q),
      "avgBuyPrice":nullf(avg),
      "lastPrice":nullf(c),
    })
  }
  json.NewEncoder(w).Encode(out)
}

func (a *App) getPreferences(w http.ResponseWriter, r *http.Request){
  u := getUserID(r)
  var markets, watchlist string
  var completed bool
  err := a.db.QueryRow(`SELECT 
    COALESCE(array_to_string(preferred_markets, ','), '') as markets,
    COALESCE(array_to_string(watchlist, ','), '') as watchlist,
    onboarding_completed 
    FROM user_preferences WHERE user_id=$1`, u).Scan(&markets, &watchlist, &completed)
  
  if err != nil {
    if err == sql.ErrNoRows {
      // Create default preferences
      _, err = a.db.Exec("INSERT INTO user_preferences(user_id) VALUES($1)", u)
      if err != nil { http.Error(w,err.Error(),500); return }
      json.NewEncoder(w).Encode(UserPreferences{[]string{}, []string{}, false})
      return
    }
    http.Error(w,err.Error(),500); return
  }
  
  var marketsList, watchlistList []string
  if markets != "" { marketsList = strings.Split(markets, ",") }
  if watchlist != "" { watchlistList = strings.Split(watchlist, ",") }
  
  json.NewEncoder(w).Encode(UserPreferences{marketsList, watchlistList, completed})
}

type prefReq struct {
  PreferredMarkets    []string `json:"preferred_markets"`
  Watchlist          []string `json:"watchlist"`
  OnboardingCompleted bool    `json:"onboarding_completed"`
}

func (a *App) updatePreferences(w http.ResponseWriter, r *http.Request){
  u := getUserID(r); var pr prefReq; json.NewDecoder(r.Body).Decode(&pr)
  
  _, err := a.db.Exec(`INSERT INTO user_preferences(user_id,preferred_markets,watchlist,onboarding_completed) 
    VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET 
    preferred_markets=EXCLUDED.preferred_markets, watchlist=EXCLUDED.watchlist, 
    onboarding_completed=EXCLUDED.onboarding_completed`, 
    u, pq.Array(pr.PreferredMarkets), pq.Array(pr.Watchlist), pr.OnboardingCompleted)
  if err!=nil { http.Error(w,err.Error(),500); return }
  w.Write([]byte(`{"ok":true}`))
}

// Admin endpoints
func (a *App) getAllUsers(w http.ResponseWriter, r *http.Request){
  rows, err := a.db.Query(`SELECT id, email, role, created_at FROM users ORDER BY created_at DESC`)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next(){
    var id int; var email, role string; var created time.Time
    rows.Scan(&id,&email,&role,&created)
    out = append(out, map[string]any{"id":id,"email":email,"role":role,"created_at":created})
  }
  json.NewEncoder(w).Encode(out)
}

func (a *App) getAllPortfolios(w http.ResponseWriter, r *http.Request){
  rows, err := a.db.Query(`SELECT u.id, u.email, p.symbol, p.quantity, p.avg_buy_price, sp.close 
    FROM users u 
    LEFT JOIN portfolios p ON u.id = p.user_id 
    LEFT JOIN LATERAL (
      SELECT close FROM stock_prices WHERE symbol=p.symbol ORDER BY ts DESC LIMIT 1
    ) sp ON true 
    ORDER BY u.email, p.symbol`)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  
  userPortfolios := make(map[string]any)
  for rows.Next(){
    var userID int; var email string; var symbol sql.NullString
    var quantity, avgPrice, lastPrice sql.NullFloat64
    rows.Scan(&userID,&email,&symbol,&quantity,&avgPrice,&lastPrice)
    
    if _, exists := userPortfolios[email]; !exists {
      userPortfolios[email] = map[string]any{
        "user_id": userID,
        "email": email,
        "portfolio": []map[string]any{},
      }
    }
    
    if symbol.Valid {
      portfolio := userPortfolios[email].(map[string]any)["portfolio"].([]map[string]any)
      portfolio = append(portfolio, map[string]any{
        "symbol": symbol.String,
        "quantity": nullf(quantity),
        "avgBuyPrice": nullf(avgPrice),
        "lastPrice": nullf(lastPrice),
      })
      userPortfolios[email].(map[string]any)["portfolio"] = portfolio
    }
  }
  
  result := []map[string]any{}
  for _, v := range userPortfolios {
    result = append(result, v.(map[string]any))
  }
  json.NewEncoder(w).Encode(result)
}

func (a *App) getUserPortfolio(w http.ResponseWriter, r *http.Request){
  userIDStr := mux.Vars(r)["id"]
  userID, err := strconv.Atoi(userIDStr)
  if err != nil { http.Error(w,"invalid user id",400); return }
  
  rows, err := a.db.Query(`SELECT p.symbol, p.quantity, p.avg_buy_price, sp.close FROM portfolios p
    LEFT JOIN LATERAL (
      SELECT close FROM stock_prices WHERE symbol=p.symbol ORDER BY ts DESC LIMIT 1
    ) sp ON true WHERE p.user_id=$1 ORDER BY p.symbol`, userID)
  if err!=nil { http.Error(w,err.Error(),500); return }
  defer rows.Close()
  out := []map[string]any{}
  for rows.Next(){ 
    var s string; var q, avg sql.NullFloat64; var c sql.NullFloat64
    rows.Scan(&s,&q,&avg,&c)
    out = append(out, map[string]any{
      "symbol":s,
      "quantity":nullf(q),
      "avgBuyPrice":nullf(avg),
      "lastPrice":nullf(c),
    })
  }
  json.NewEncoder(w).Encode(out)
}

func getUserID(r *http.Request) int {
  userIDStr := r.Header.Get("X-User-ID")
  userID, _ := strconv.Atoi(userIDStr)
  return userID
}

func getUserFromContext(r *http.Request) User {
  userID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))
  return User{
    ID:    userID,
    Email: r.Header.Get("X-User-Email"),
    Role:  r.Header.Get("X-User-Role"),
  }
}

func nullf(n sql.NullFloat64) *float64 { if n.Valid { return &n.Float64 }; return nil }
func nulli(n sql.NullInt64) *int64 { if n.Valid { return &n.Int64 }; return nil }