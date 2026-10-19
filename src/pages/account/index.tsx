import { getClient } from '../../lib/portal'
export default function Account() {
  return <main className="mx-auto my-16 rounded-xl bg-[#fffefa] p-10 text-[#233c34]">
    <h1 className="text-3xl">Welcome to Daydream</h1>
    <p className="my-4">Your customer access is approved. You are signed in.</p>
    <button className="underline" onClick={() => { void getClient().auth.signOut() }}>Sign out</button>
  </main>
}
