import server from './app.js';
import { env } from './env.js';

server.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
