// Root entrypoint – required by Railway.
// Simply loads the real backend server located inside /backend/src/server.js
import('./backend/src/server.js')
  .catch(err => {
    console.error("Failed to start backend:", err);
  });
