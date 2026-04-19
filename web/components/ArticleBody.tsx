function renderBlock(block: string, index: number) {
  const b = block.trim();
  if (!b) return null;
  if (b.startsWith("## ")) {
    return <h2 key={index}>{b.slice(3).trim()}</h2>;
  }
  if (b.startsWith("# ")) {
    return <h2 key={index}>{b.slice(2).trim()}</h2>;
  }
  return (
    <p key={index}>
      {b.split("\n").map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </p>
  );
}

export function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = markdown.trim().split(/\n\n+/);
  return (
    <div className="kb-article-body">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
