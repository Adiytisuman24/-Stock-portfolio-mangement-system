import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
export default function StockChart({data}){
  const d=data.slice().reverse().map(x=>({ ...x, ts:new Date(x.ts).toLocaleString() }));
  return (<div className="h-80">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={d}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="ts" hide />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="close" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
  </div>);
}