import ButtonAccount from "@/components/ButtonAccount";
import NotionEditor from "@/components/Editor";
import Generator from "@/components/Generator";


export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
export default async function Dashboard() {
  return (
    <main className="min-h-screen p-8 pb-24">
      <section className="max-w-xxl mx-auto space-y-8">
        <ButtonAccount />
        <h1 className="text-3xl md:text-4xl font-extrabold">You are signed in</h1>
        <Generator/>

        <NotionEditor />
        
      </section>
    </main>
  );
}
