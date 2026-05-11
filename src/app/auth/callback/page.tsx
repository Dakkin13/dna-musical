import CallbackHandler from "./CallbackHandler";

// searchParams es una Promise en Next.js 15+ (ver docs/api-reference/file-conventions/page.md)
export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    state?: string;
  }>;
}) {
  const { code, error } = await searchParams;

  return (
    <main>
      <CallbackHandler code={code} spotifyError={error} />
    </main>
  );
}
