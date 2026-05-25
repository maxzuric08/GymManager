const app = require("./src/app");
const initializeScheduledTasks = require("./src/scheduledTasks");

app.listen(3000, () => {
    console.log("Servidor corriendo en puerto 3000");
    // Inicializar tareas programadas
    initializeScheduledTasks();
});