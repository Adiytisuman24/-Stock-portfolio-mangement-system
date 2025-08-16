export default function StockTable({rows,onClick}){
  return (<table className="w-full text-sm">
    <thead><tr><th className="text-left">Symbol</th><th>Price</th><th>Volume</th><th>Time</th></tr></thead>
    <tbody>
      {rows.map((r,i)=>(
        <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={()=>onClick(r.symbol)}>
          <td>{r.symbol}</td><td>{r.close??"-"}</td><td>{r.volume??"-"}</td><td>{new Date(r.ts).toLocaleString()}</td>
        </tr>))}
      )
      )
      }
    </tbody>
  )
  </table>);
}