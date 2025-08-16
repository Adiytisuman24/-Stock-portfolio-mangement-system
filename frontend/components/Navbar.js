import Link from "next/link";
export default function Navbar(){
  return (<nav className="p-4 flex gap-4 bg-gray-100">
    <Link href="/">Dashboard</Link>
    <Link href="/portfolio">Portfolio</Link>
    <div className="ml-auto flex gap-3">
      <Link href="/login">Login</Link>
      <Link href="/register">Register</Link>
    </div>
  )
  </nav>);
}