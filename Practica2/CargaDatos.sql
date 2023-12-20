
-- Cargar Habitaciones
LOAD DATA INFILE 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Uploads\\Entradas\\Dia1\\Habitaciones.csv'
INTO TABLE HABITACION
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(idHabitacion, habitacion);

-- Cargar Pacientes
LOAD DATA INFILE 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Uploads\\Entradas\\Dia1\\Pacientes.csv'
INTO TABLE PACIENTE
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(idPaciente, edad, genero);

-- Cargar LogActividades1
LOAD DATA INFILE 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Uploads\\Entradas\\Dia1\\LogActividades1.csv'
INTO TABLE LOG_ACTIVIDAD
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(timestampx, actividad, HABITACION_idHabitacion, PACIENTE_idPaciente);

-- Cargar LogActividades2
LOAD DATA INFILE 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Uploads\\Entradas\\Dia1\\LogActividades2.csv'
INTO TABLE LOG_ACTIVIDAD
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(timestampx, actividad, HABITACION_idHabitacion, PACIENTE_idPaciente);

-- Cargar LogHabitaciones 
LOAD DATA INFILE 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Uploads\\Entradas\\Dia1\\LogHabitacion.csv'
INTO TABLE LOG_HABITACION
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(idHabitacion, timestampx, statusx);