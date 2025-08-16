export default function StatusBadge({ok}){ return <span className={`px-2 py-1 rounded ${ok?'bg-green-200':'bg-red-200'}`}>{ok?'Healthy':'Issue'}</span> }
}