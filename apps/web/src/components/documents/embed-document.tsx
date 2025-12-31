const EmbedDocument: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative flex flex-1 flex-col p-4 w-full max-w-7xl mx-auto">
      <div className="viewer-container">{children}</div>
    </div>
  );
};

export default EmbedDocument;
