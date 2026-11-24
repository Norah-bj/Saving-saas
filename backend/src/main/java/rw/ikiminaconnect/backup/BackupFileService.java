package rw.ikiminaconnect.backup;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import rw.ikiminaconnect.common.ConflictException;

/**
 * Runs a real {@code pg_dump} as a subprocess — the "real backup" from
 * docs/DECISIONS.md ("Real backups are platform-wide only — no per-tenant
 * restore"). Custom format ({@code -F c}), the standard {@code pg_restore}-
 * compatible format, not plain SQL — compressed and supports selective
 * restore if an ops person ever needs just one table.
 *
 * <p>Runs synchronously, blocking the HTTP request for as long as the dump
 * takes. Accepted at this project's scale (see docs/DECISIONS.md) — a real
 * production-sized database would need this to be an async/queued job
 * instead, with the endpoint returning immediately and the record's status
 * updated on completion. Not built here since nothing in this schema models
 * an in-progress backup state, and no polling UI exists to show one.
 */
@Component
public class BackupFileService {

    private static final Logger log = LoggerFactory.getLogger(BackupFileService.class);
    private static final DateTimeFormatter FILENAME_TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final String directory;
    private final String pgDumpPath;
    private final String dbHost;
    private final String dbPort;
    private final String dbName;
    private final String dbUsername;
    private final String dbPassword;

    public BackupFileService(
            @Value("${app.backup.directory}") String directory,
            @Value("${app.backup.pg-dump-path}") String pgDumpPath,
            @Value("${app.backup.db-host}") String dbHost,
            @Value("${app.backup.db-port}") String dbPort,
            @Value("${app.backup.db-name}") String dbName,
            @Value("${spring.datasource.username}") String dbUsername,
            @Value("${spring.datasource.password}") String dbPassword) {
        this.directory = directory;
        this.pgDumpPath = pgDumpPath;
        this.dbHost = dbHost;
        this.dbPort = dbPort;
        this.dbName = dbName;
        this.dbUsername = dbUsername;
        this.dbPassword = dbPassword;
    }

    public record DumpResult(Path filePath, long sizeBytes) {
    }

    /** @throws ConflictException if pg_dump exits non-zero or can't be launched at all. */
    public DumpResult dump(String label) {
        try {
            // Absolute, so the recorded file_path tells an operator exactly
            // where the dump lives regardless of the process's working dir.
            Path dir = Path.of(directory).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String safeLabel = label.replaceAll("[^a-zA-Z0-9-_]", "_");
            String fileName = "backup-%s-%s.dump".formatted(
                    FILENAME_TIMESTAMP.format(Instant.now().atZone(java.time.ZoneOffset.UTC)), safeLabel);
            Path outputFile = dir.resolve(fileName);

            List<String> command = List.of(
                    pgDumpPath, "-h", dbHost, "-p", dbPort, "-U", dbUsername, "-d", dbName,
                    "-F", "c", "-f", outputFile.toString());

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            processBuilder.environment().put("PGPASSWORD", dbPassword);
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            String output;
            try (var reader = process.inputReader()) {
                output = reader.lines().reduce("", (a, b) -> a + "\n" + b);
            }
            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                Files.deleteIfExists(outputFile);
                throw new ConflictException("Backup timed out after 5 minutes.");
            }
            if (process.exitValue() != 0) {
                log.error("pg_dump failed (exit {}): {}", process.exitValue(), output);
                // Don't leave a truncated, unrestorable .dump file behind.
                Files.deleteIfExists(outputFile);
                throw new ConflictException("Backup failed — pg_dump exited with an error. See server logs.");
            }

            long sizeBytes = Files.size(outputFile);
            return new DumpResult(outputFile, sizeBytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not run pg_dump — is it installed and on PATH "
                    + "(or app.backup.pg-dump-path configured correctly)?", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ConflictException("Backup was interrupted.");
        }
    }
}
