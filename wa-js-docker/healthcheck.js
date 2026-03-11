const port = process.env.PORT || 2004;

fetch(`http://127.0.0.1:${port}/health`)
  .then((response) => {
    process.exit(response.ok ? 0 : 1);
  })
  .catch(() => {
    process.exit(1);
  });
