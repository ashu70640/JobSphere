// JobSphere Admin — new file, safe to delete without affecting core app
// Single registry that holds all model instances after DB connections are ready.
// Controllers call getModels() instead of importing models directly, avoiding
// "model not registered on this connection" errors from timing issues.

let registry = null;

export const initModels = (models) => {
  registry = models;
};

export const getModels = () => {
  if (!registry) throw new Error("Models not initialised — call initModels() first");
  return registry;
};
