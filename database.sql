-- Esquema MySQL para la API de gestión de postulaciones laborales.
-- Selecciona previamente la base indicada por DB_NAME antes de ejecutar este archivo.

-- Se eliminan primero las tablas dependientes para permitir una recreación limpia del esquema.
DROP TABLE IF EXISTS postulaciones;
DROP TABLE IF EXISTS vacantes;
DROP TABLE IF EXISTS candidatos;

-- Los candidatos son las personas que pueden postularse a una o varias vacantes.
CREATE TABLE candidatos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    experiencia_anios INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_candidatos_correo UNIQUE (correo),
    CONSTRAINT chk_candidatos_experiencia CHECK (experiencia_anios >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Cada vacante indica la experiencia mínima y si acepta nuevas postulaciones.
CREATE TABLE vacantes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    experiencia_minima INT UNSIGNED NOT NULL,
    estado ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    PRIMARY KEY (id),
    CONSTRAINT chk_vacantes_experiencia CHECK (experiencia_minima >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Una postulación relaciona candidato y vacante; las restricciones impiden duplicados y huérfanos.
CREATE TABLE postulaciones (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    candidato_id INT UNSIGNED NOT NULL,
    vacante_id INT UNSIGNED NOT NULL,
    carta_presentacion TEXT NOT NULL,
    fuente ENUM('REFERRAL', 'INTERNAL', 'JOB_BOARD', 'OTHER') NOT NULL,
    puntaje INT UNSIGNED NOT NULL DEFAULT 0,
    prioridad ENUM('LOW', 'MEDIUM', 'HIGH', 'TOP') NOT NULL DEFAULT 'LOW',
    estado ENUM('RECEIVED', 'IN_REVIEW', 'REJECTED', 'HIRED') NOT NULL DEFAULT 'RECEIVED',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uk_postulacion_candidato_vacante UNIQUE (candidato_id, vacante_id),
    CONSTRAINT chk_postulaciones_puntaje CHECK (puntaje >= 0),
    CONSTRAINT fk_postulacion_candidato
        FOREIGN KEY (candidato_id) REFERENCES candidatos(id) ON DELETE CASCADE,
    CONSTRAINT fk_postulacion_vacante
        FOREIGN KEY (vacante_id) REFERENCES vacantes(id) ON DELETE CASCADE,
    INDEX idx_postulaciones_estado (estado),
    INDEX idx_postulaciones_vacante (vacante_id),
    INDEX idx_postulaciones_prioridad_fecha (puntaje DESC, fecha_creacion ASC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Datos de ejemplo para probar candidatos existentes y una vacante cerrada.
INSERT INTO candidatos (nombre, correo, experiencia_anios) VALUES
    ('Ana Gómez', 'ana.gomez@email.com', 4),
    ('Carlos Pérez', 'carlos.perez@email.com', 1),
    ('Lucía Méndez', 'lucia.mendez@email.com', 5);

INSERT INTO vacantes (titulo, experiencia_minima, estado) VALUES
    ('Desarrollador Backend Node.js', 2, 'OPEN'),
    ('Analista de Datos Junior', 1, 'CLOSED');
