const app = require("./src/app");
const initializeScheduledTasks = require("./src/scheduledTasks");
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
    // Inicializar tareas programadas
    initializeScheduledTasks();
});
