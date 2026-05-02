export const API_BASE =
  typeof window !== "undefined"
    ? "/api/evaluation-service"
    : (process.env.NEXT_PUBLIC_EVALUATION_API_BASE ?? "");
