import cluster from "cluster";
import os from "os";

if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;

  console.log(`Auth service using ${cpuCount} CPUs`);

  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
} else {
  console.log(`Worker started PID: ${process.pid}`);
  import("./index.js");
}
