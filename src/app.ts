import express, { Request, Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import projectRoutes from "./modules/project/project.routes";
import userRoutes from "./modules/user/user.routes";
import quotationsRoutes from "./modules/quotations/quotations.routes";
import authRoutes from "./modules/auth/auth.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import supervisorRoutes from "./modules/supervisor/supervisor.routes";
import materialRoutes from "./modules/material/material.routes";
import expenseRoutes from "./modules/expense/expense.routes";
import dailyUpdatesRoutes from "./modules/daily-updates/daily-updates.routes";
import messagesRoutes from "./modules/messages/messages.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";

/* -------------------- U can have Routes N Middlewares imports-------------------- */

const app = express();


/* -------------------- Global Middlewares -------------------- */

app.use(cors());

// JSON body parser
app.use(express.json({
    limit: '10mb',
    strict: true
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------- Swagger Documentation -------------------- */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve raw OpenAPI spec as JSON for easy download
app.get("/api-docs-json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// app.listen(env.PORT,()=>{
//     console.log(`Server is running on port ${env.PORT}`);
// });


app.use("/api/project", projectRoutes)
app.use("/api/user", userRoutes)
app.use("/api/quotations", quotationsRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/documents", documentsRoutes)
app.use("/api/payment", paymentRoutes)
app.use("/api/supervisor", supervisorRoutes)
app.use("/api/material", materialRoutes)
app.use("/api/expense", expenseRoutes)
app.use("/api/daily-updates", dailyUpdatesRoutes)
app.use("/api/messages", messagesRoutes)
app.use("/api/notifications", notificationsRoutes)

// Global Error Handler for JSON parse errors and other unhandled errors
app.use((err: any, req: Request, res: Response, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON payload provided. Please check for syntax errors like missing quotes or trailing commas."
        });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (statusCode === 500) {
        console.error("DEBUG - Internal Error:", err);
    } else {
        console.warn(`DEBUG - ${statusCode}: ${message}`);
    }

    res.status(statusCode).json({
        success: false,
        message: message
    });
});

// app.get("/",(req: Request,res:Response)=>{
//     return res.json({
//         msg:"Hello World",
//     });
// });
// module.exports = app;
// module.exports.default = app;


export default app;