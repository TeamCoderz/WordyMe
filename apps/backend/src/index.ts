import app from './app.js';
import { env } from './env.js';

app.listen(env.PORT, () => {
  console.log(`Server is running on http://localhost:${env.PORT}`);
});
