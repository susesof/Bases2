
import {
  DB_DATABASE,
  DB_HOST,
  DB_PASSWORD,
  DB_PORT,
  DB_USER,
} from "./config/config.js";



import mysql from 'mysql2';

import { exec } from 'child_process';

import { createConnection } from "mysql2";
import { createInterface } from 'readline';

var conn = createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
});



conn.connect(function (err) {
  if (err) {
    console.log('Error al conectarse a la base de datos:', err);
    throw err;
  }
  console.log("Conexion a mysql!");
  console.log('Se conectó a la base de datos exitosamente!');
  pantallaInicial();
});



const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

function preguntaOculta(query, callback) {
  const muteStdout = (char) => {
    char = char + '';
    switch (char) {
      case '\n': case '\r': case '\u0004':
        process.stdout.write('\n');
        process.stdin.removeListener('data', muteStdout);
        break;
      default:
        process.stdout.write("\x1B[2K\x1B[200D" + query + Array(rl.line.length + 1).join('*'));
        break;
    }
  };
  process.stdin.on('data', muteStdout);

  rl.question(query, function (value) {
    rl.history = rl.history.slice(1); // remove last entry from history
    callback(value);
  });
}

function pantallaInicial() {
  console.log('****** CLI HOSPITAL BIENVENIDO ******');
  console.log('1. INICIAR SESION');
  console.log('2. REGISTRAR UN NUEVO USUARIO');
  console.log('3. SALIR');
  rl.question('INGRESE UNA OPCIÓN: ', (opcion) => {
    switch (opcion) {
      case '1':
        iniciarSesion();
        break;
      case '2':
        registrarUsuario();
        break;
      case '3':
        rl.close();
        pantallaInicial();
        break;
      default:
        console.log('Opción no válida.');
        pantallaInicial();
    }
  });
}


function iniciarSesion() {
  console.log('****** INICIO DE SESIÓN ******');
  rl.question('INGRESE USUARIO: ', (usuario) => {
    preguntaOculta('INGRESE PASSWORD: ', (password) => {
      // Crear una nueva conexión con las credenciales proporcionadas
      const userConn = createConnection({
        host: DB_HOST,
        user: usuario,
        password: password,
        database: DB_DATABASE,
        port: DB_PORT,
      });

      // Intentar conectar con la base de datos usando las credenciales del usuario
      userConn.connect(function (err) {
        if (err) {
          console.error('Error al conectarse a la base de datos con el usuario:', usuario, err);
          pantallaInicial(); // Regresar a la pantalla inicial si la conexión falla
        } else {
          console.log('Conexión a MySQL exitosa con el usuario:', usuario);
          pantallaMenuPrincipal(usuario, userConn);


        }

      });
    });
  });
}







function registrarUsuario() {
  console.log('****** REGISTRO DE NUEVO USUARIO ******');
  rl.question('INGRESE NUEVO USUARIO: ', (nuevoUsuario) => {
    // Verificar primero si el usuario ya existe
    conn.query('SELECT usuario FROM EMPLEADO WHERE usuario = ?', [nuevoUsuario], (err, results) => {
      if (err) {
        console.error('Error al verificar la existencia del usuario:', err.message);
        pantallaInicial();
        return;
      }
      if (results.length > 0) {
        console.log('El usuario ya existe. Por favor, elija un nombre de usuario diferente.');
        pantallaInicial();
        return;
      }
      preguntaOculta('INGRESE CONTRASEÑA: ', (contrasena) => {
        rl.question('INGRESE USUARIO ADMINISTRADOR: ', (usuarioAdmin) => {
          preguntaOculta('INGRESE CONTRASEÑA ADMINISTRADOR: ', (contrasenaAdmin) => {
            rl.question('INGRESE EL ROL DEL NUEVO USUARIO: ', (rol) => {
              rl.question('REGISTRAR NUEVO USUARIO: SI (S), NO (N) ', (confirmacion) => {
                if (confirmacion.toUpperCase() === 'S') {
                  // Crear una nueva conexión con las credenciales proporcionadas
                  const userConn = createConnection({
                    host: DB_HOST,
                    user: usuarioAdmin,
                    password: contrasenaAdmin,
                    database: DB_DATABASE,
                    port: DB_PORT,
                    multipleStatements: true
                  });

                  // Intentar conectar con la base de datos usando las credenciales del usuario
                  userConn.connect(function (err) {
                    if (err) {
                      console.error('Error al conectarse a la base de datos con el usuario:', usuarioAdmin, err);
                      pantallaInicial();
                    } else {
                      console.log('Conexión a MySQL exitosa con el usuario:', usuarioAdmin);
                      // Crear usuario
                      const crearUsuarioSQL = `CREATE USER '${nuevoUsuario}'@'%' IDENTIFIED BY ?`;
                      userConn.query(crearUsuarioSQL, [contrasena], (err, result) => {
                        if (err) {
                          console.error('Error al crear el usuario:', err.message);
                          userConn.end();
                          pantallaInicial();
                          return;
                        }



                        // Asignar rol
                        const asignarRolSQL = `GRANT ${rol} TO '${nuevoUsuario}'@'%'`;
                        userConn.query(asignarRolSQL, (err, result) => {
                          if (err) {
                            console.error('Error al asignar el rol:', err.message);
                            userConn.end();
                            pantallaInicial();
                            return;
                          }

                          // Establecer rol por defecto
                          const setDefaultRoleSQL = `SET DEFAULT ROLE '${rol}' TO '${nuevoUsuario}'@'%'`;
                          userConn.query(setDefaultRoleSQL, (err, result) => {
                            if (err) {
                              console.error('Error al establecer el rol por defecto:', err.message);
                              userConn.end();
                              pantallaInicial();
                              return;
                            }

                            // FLUSH PRIVILEGES
                            userConn.query('FLUSH PRIVILEGES', (err, result) => {
                              if (err) {
                                console.error('Error al ejecutar FLUSH PRIVILEGES:', err.message);
                              } else {
                                console.log('Privilegios actualizados y usuario registrado exitosamente.');
                              }
                              userConn.end();
                              pantallaInicial();
                              return;

                            })

                            // Ahora, agregar el usuario a la tabla EMPLEADO
                            // Crear conexión con múltiples consultas habilitadas

                            // Consulta para agregar empleado y registrar en bitácora
                            const agregarEmpleadoYRegistrarBitacoraSQL = `
                            INSERT INTO EMPLEADO (usuario, contrasenia, rol, fecha_hora) VALUES (?, ?, ?, NOW());
                            INSERT INTO BITACORA (accion, mensaje,usuario_log, fecha_hora) VALUES (?, ?, ?, NOW())
                            `;

                            // Valores para las consultas
                            let accion = 'Registro';
                            let mensaje = `Registro del usuario ${nuevoUsuario}`;
                            const valoresEmpleado = [nuevoUsuario, contrasena, rol];
                            const valoresBitacora = [accion, mensaje,usuarioAdmin];

                            // Ejecutar consultas
                            userConn.query(agregarEmpleadoYRegistrarBitacoraSQL, [...valoresEmpleado, ...valoresBitacora], (err, results) => {
                              if (err) {
                                console.error('Error al ejecutar las consultas:', err.message);
                                return;
                              }
                              console.log('Empleado agregado y bitácora actualizada exitosamente.');
                              // Otras acciones...
                            });

                            // Cerrar conexión
                           userConn.end();
                            

                          });
                        });
                      });
                      pantallaInicial();
                    }
                  });
                } else {
                  console.log('Registro cancelado.');
                  pantallaInicial();
                }
              });
            });
          });
        });
      });
    });
  });
}

function pantallaMenuPrincipal(usuario, userConn) {
  console.log('****** BIENVENIDO USUARIO: ' + usuario + ' ******');
  console.log('MENU:');
  console.log('1. CONSULTAS');
  console.log('2. ACTUALIZAR REGISTROS');
  console.log('3. AGREGAR REGISTROS');
  console.log('4. ELIMINAR REGISTROS');
  console.log('5. REALIZAR RESPALDO COMPLETO');
  console.log('6. VER RESPALDOS REALIZADOS');
  console.log('7. RESTAURAR RESPALDO');
  rl.question('SELECCIONE UNA OPCIÓN: ', (opcionMenuPrincipal) => {
    switch (opcionMenuPrincipal) {
      case '1':
        pantalla4('CONSULTAS', usuario, userConn);
        break;
      case '2':
        pantalla4('ACTUALIZAR', usuario, userConn);
        break;
      case '3':
        pantalla4('AGREGAR', usuario, userConn);
        break;
      case '4':
        pantalla4('ELIMINAR', usuario, userConn);
        break;
      case '5':
        realizarRespaldo(usuario, userConn);
        break;
      case '6':
        listarRespaldosRealizados();
        break;
      case '7':
        restaurarRespaldo(usuario, userConn);
        break;
      default:
        console.log('Opción no válida.');
        pantallaMenuPrincipal(usuario, userConn);
    }
  });
}

function pantalla4(operacion, usuario, userConn) {
  console.log('****** BIENVENIDO USUARIO: ' + usuario + ' ******');
  console.log(`Operación seleccionada: ${operacion}`);
  console.log('1. PACIENTES');
  console.log('2. HABITACIONES');
  console.log('3. LOG ACTIVIDAD');
  console.log('4. LOG HABITACION');
  rl.question('SELECCIONE UNA OPCIÓN: ', (opcionMenuPrincipal) => {
    switch (opcionMenuPrincipal) {
      case '1':
        realizarOperacion('PACIENTE', operacion, userConn, usuario);
        break;
      case '2':
        realizarOperacion('HABITACION', operacion, userConn, usuario);
        break;
      case '3':
        realizarOperacion('LOG_ACTIVIDAD', operacion, userConn, usuario);
        break;
      case '4':
        realizarOperacion('LOG_HABITACION', operacion, userConn, usuario);
        break;
      default:
        console.log('Opción no válida.');
        pantallaMenuPrincipal(usuario, userConn);
    }
  });
}



function VerificarAdmin(username, callback) {
  // Asegúrate de que la conexión 'conn' es con un usuario que tiene permisos suficientes para consultar estas tablas.
  const query = `
    SELECT * FROM mysql.role_edges 
    WHERE TO_USER = ? AND TO_HOST = '%' AND FROM_USER = 'Administrador';
  `;

  conn.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error al verificar el rol del usuario:', err);
      return callback(err, null);
    }
    // Si hay resultados, entonces el usuario tiene el rol 'Administrador'
    const hasRole = results.length > 0;
    callback(null, hasRole);
  });
}



function realizarOperacion(tabla, operacion, userConn, usuario) {
  console.log(`Realizando ${operacion} en la tabla ${tabla}`);

  let query = '';
  let accion = '';
  let mensaje = '';


  switch (operacion) {
    case 'CONSULTAS':
      query = `SELECT * FROM ${tabla};`;
      accion = 'Consulta';
      mensaje = `Consulta de registros en la tabla ${tabla}`
      break;
    case 'ACTUALIZAR':
      if (tabla === 'PACIENTE') {
        rl.question('Ingrese el ID del paciente a actualizar: ', (idPaciente) => {
          rl.question('Ingrese la nueva edad del paciente: ', (nuevaEdad) => {
            rl.question('Ingrese el nuevo género del paciente: ', (nuevoGenero) => {
              query = `UPDATE PACIENTE SET edad = ?, genero = ? WHERE idPaciente = ?;`;
              userConn.query(query, [nuevaEdad, nuevoGenero, idPaciente], (err, results) => {
                if (err) console.error(err);
                else console.log('Registro actualizado con éxito');
                rl.close();
              });
            });
          });
        });
      } else if (tabla === 'LOG_ACTIVIDAD') {
        rl.question('Ingrese el ID del log de actividad a actualizar: ', (idLogActividad) => {
          rl.question('Ingrese la nueva actividad: ', (nuevaActividad) => {
            rl.question('Ingrese el nuevo ID de habitación (dejar en blanco si no se cambia): ', (nuevoIdHabitacion) => {
              rl.question('Ingrese el nuevo ID de paciente (dejar en blanco si no se cambia): ', (nuevoIdPaciente) => {
                query = `UPDATE LOG_ACTIVIDAD SET actividad = ?, HABITACION_idHabitacion = COALESCE(?, HABITACION_idHabitacion), PACIENTE_idPaciente = COALESCE(?, PACIENTE_idPaciente) WHERE id_log_actividad = ?;`;
                userConn.query(query, [nuevaActividad, nuevoIdHabitacion || null, nuevoIdPaciente || null, idLogActividad], (err, results) => {
                  if (err) console.error(err);
                  else console.log('Log de actividad actualizado con éxito');
                  rl.close();
                });
              });
            });
          });
        });
      } else if (tabla === 'LOG_HABITACION') {
        rl.question('Ingrese el ID del log de habitación a actualizar: ', (idLogHabitacion) => {
          rl.question('Ingrese el nuevo estado: ', (nuevoEstado) => {
            query = `UPDATE LOG_HABITACION SET statusx = ? WHERE id_log_habitacion = ?;`;
            userConn.query(query, [nuevoEstado, idLogHabitacion], (err, results) => {
              if (err) console.error(err);
              else console.log('Log de habitación actualizado con éxito');
              rl.close();
            });
          });
        });
      } else if (tabla === 'HABITACION') {
        rl.question('Ingrese el ID de la habitación a actualizar: ', (idHabitacion) => {
          rl.question('Ingrese el nuevo nombre de la habitación (dejar en blanco para no cambiar): ', (nuevaHabitacion) => {
            if (!nuevaHabitacion) {
              console.log('No se realizaron cambios.');
              pantallaMenuPrincipal(usuario, userConn);
              return;
            }
            query = `UPDATE HABITACION SET habitacion = ? WHERE idHabitacion = ?;`;
            userConn.query(query, [nuevaHabitacion, idHabitacion], (err, results) => {
              if (err) console.error(err);
              else console.log('Habitación actualizada con éxito');
              rl.close();
            });
          });
        });
      } else {
        console.log('Operación no permitida en esta tabla');
        pantallaMenuPrincipal(usuario, userConn);
      }
      accion = 'Actualización';
      mensaje = `Actualización de registros en la tabla ${tabla}`;
      break;

    case 'AGREGAR':
      switch (tabla) {

        case 'HABITACION':
          rl.question('Ingrese el ID de la nueva habitación: ', (idHabitacion) => {
            rl.question('Ingrese el nombre de la habitación: ', (nombreHabitacion) => {
              query = `INSERT INTO HABITACION (idHabitacion, habitacion) VALUES (?, ?);`;
              userConn.query(query, [idHabitacion, nombreHabitacion], (err, results) => {
                if (err) console.error(err);
                else console.log('Habitación agregada con éxito');
                rl.close();
              });
            });
          });

          break;
        case 'LOG_ACTIVIDAD':
          // Asumiendo que necesitas idHabitacion y idPaciente, y que el timestamp se genera automáticamente
          rl.question('Ingrese la actividad: ', (actividad) => {
            rl.question('Ingrese el ID de la habitación: ', (idHabitacion) => {
              rl.question('Ingrese el ID del paciente: ', (idPaciente) => {
                query = `INSERT INTO LOG_ACTIVIDAD (actividad, HABITACION_idHabitacion, PACIENTE_idPaciente) VALUES (?, ?, ?);`;
                userConn.query(query, [actividad, idHabitacion, idPaciente], (err, results) => {
                  if (err) console.error(err);
                  else console.log('Log de actividad agregado con éxito');
                  rl.close();
                });
              });
            });
          });
          break;
        case 'LOG_HABITACION':
          rl.question('Ingrese el ID de la habitación: ', (idHabitacion) => {
            rl.question('Ingrese el estado: ', (estado) => {
              query = `INSERT INTO LOG_HABITACION (idHabitacion, statusx) VALUES (?, ?);`;
              userConn.query(query, [idHabitacion, estado], (err, results) => {
                if (err) console.error(err);
                else console.log('Log de habitación agregado con éxito');
                rl.close();
              });
            });
          });
          break;

      }
      accion = 'Inserción';
      mensaje = `Inserción de registros en la tabla ${tabla}`;
      break;
    case 'ELIMINAR':
      switch (tabla) {
        case 'PACIENTE':
          rl.question('Ingrese el ID del paciente a eliminar: ', (idPaciente) => {
            query = `DELETE FROM PACIENTE WHERE idPaciente = ?;`;
            userConn.query(query, [idPaciente], (err, results) => {
              if (err) console.error(err);
              else console.log('Paciente eliminado con éxito');
              rl.close();
            });
          });
          break;

        case 'HABITACION':
          rl.question('Ingrese el ID de la habitación a eliminar: ', (idHabitacion) => {
            query = `DELETE FROM HABITACION WHERE idHabitacion = ?;`;
            userConn.query(query, [idHabitacion], (err, results) => {
              if (err) console.error(err);
              else console.log('Habitación eliminada con éxito');
              rl.close();
            });
          });
          break;
        case 'LOG_ACTIVIDAD':
          rl.question('Ingrese el ID del log de actividad a eliminar: ', (idLogActividad) => {
            query = `DELETE FROM LOG_ACTIVIDAD WHERE id_log_actividad = ?;`;
            userConn.query(query, [idLogActividad], (err, results) => {
              if (err) console.error(err);
              else console.log('Log de actividad eliminado con éxito');
              rl.close();
            });
          });
          break;
        case 'LOG_HABITACION':
          rl.question('Ingrese el ID del log de habitación a eliminar: ', (idLogHabitacion) => {
            query = `DELETE FROM LOG_HABITACION WHERE id_log_habitacion = ?;`;
            userConn.query(query, [idLogHabitacion], (err, results) => {
              if (err) console.error(err);
              else console.log('Log de habitación eliminado con éxito');
              rl.close();
            });
          });
          break;

      }
      accion = 'Eliminación';
      mensaje = `Eliminación de registros en la tabla ${tabla}`;
      break;
    default:
      console.log('Operación no reconocida.');
      pantallaMenuPrincipal(usuario, userConn);
      return;
  }



  // Registrar la acción en la bitácora
  registrarEnBitacora(usuario, accion, mensaje, userConn);

  userConn.query(query, function (err, results, fields) {
    if (err) {
      console.error('Error al realizar la operación:', err.message);
      userConn.end();
      pantallaMenuPrincipal(usuario, userConn);
      return;
    }


    console.log('Resultados de la operación:', results);
    // Registrar la acción en la bitácora y luego cerrar la conexión
    registrarEnBitacora(usuario, accion, mensaje, userConn, () => {
      userConn.end(); // Cierra la conexión aquí
      pantallaMenuPrincipal(usuario, userConn);
    });
  });
}



function registrarEnBitacora(usuario, accion, mensaje, userConn, callback) {
  const query = `INSERT INTO BITACORA (accion, mensaje, usuario_log, fecha_hora) VALUES (?, ?, ?, NOW())`;
  userConn.query(query, [accion, mensaje, usuario], (err, result) => {
    if (err) {
      console.error('Error al registrar en la bitácora:', err.message);
    } else {
      console.log('Acción registrada en la bitácora.');
    }
    callback(); // Ejecuta el callback después de completar la operación
  });
}



// Utilidad para obtener la fecha y hora en el formato deseado
function getFormattedTimestamp() {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}-${month}-${year} ${hours}_${minutes}_${seconds}`;
}


// Función para realizar respaldo completo
function realizarRespaldo(usuario, userConn) {
  const backupFileName = `${getFormattedTimestamp()}.sql`;

  const command = `mysqldump -u${userConn.user} -p${userConn.password} ${userConn.database} > ${backupFileName}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al realizar el respaldo: ${error}`);
      return;
    }
    console.log(`Respaldo realizado con éxito: ${backupFileName}`);
  });
}

// Función para restaurar respaldo
function restaurarRespaldo(usuario, userConn) {
  rl.question('Ingrese el nombre del archivo de respaldo a restaurar: ', (backupFileName) => {
    if (!fs.existsSync(backupFileName)) {
      console.error('El archivo de respaldo no existe.');
      rl.close();
      return;
    }

    const command = `mysql -u${userConn.user} -p${userConn.password} ${userConn.database} < ${backupFileName}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al restaurar el respaldo: ${error}`);
        return;
      }
      console.log(`Respaldo restaurado con éxito: ${backupFileName}`);
    });
  });
}


// Función para listar todos los archivos de respaldo
function listarRespaldosRealizados() {
  // Reemplaza con la ruta del directorio donde guardas los respaldos
  const directoryPath = path.join(__dirname, 'ruta/a/tu/directorio/de/respaldos');

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(`Ocurrió un error al intentar leer el directorio: ${err.message}`);
      return;
    }

    const backupFiles = files.filter(file => file.match(/^\d{2}-\d{2}-\d{4}\s\d{2}_\d{2}_\d{2}\.sql$/));

    if (backupFiles.length === 0) {
      console.log('No se encontraron archivos de respaldo.');
      return;
    }

    console.log('Listado de respaldos realizados:');
    backupFiles.forEach(file => {
      console.log(file);
    });
  });
}
