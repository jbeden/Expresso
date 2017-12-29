const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(process.env.TEST_DATABASE || './database.sqlite');

// const checkIfExists = function (req, res, next) {
//   db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
//     if (err || !row) {
//       return res.status(404).send();
//     }
//   });
//   next();
// }

app.get('/api/employees', (req, res, next) => {
  db.all(`SELECT * FROM Employee WHERE is_current_employee = 1`, (err, rows) => {
    res.status(200).send({employees: rows});
  })
});

app.post('/api/employees', (req, res, next) => {
  const emp = req.body.employee;
  if (!emp.name || !emp.position || !emp.wage) {
    return res.sendStatus(400);
  }
  db.run(`INSERT INTO Employee (name, position, wage, is_current_employee) VALUES (
    '${emp.name}', '${emp.position}', ${emp.wage}, 1)`,
    function (err) {
      if (err) {
        return res.sendStatus(400);
      }
      db.get(`SELECT * FROM Employee WHERE id = ${this.lastID}`, (err, row) => {
        res.status(201).send({employee: row});
      });
    });
});

app.get('/api/employees/:id', (req, res, next) => {
  db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
    if (err) {
      res.status(404).send();
    }
    else {
      if (row) {
        res.status(200).send({employee: row});
      }
      else {
        res.status(404).send();
      }
    }
  })
});

app.put('/api/employees/:id', (req, res, next) => {
  const emp = req.body.employee;
  if (!emp.name || !emp.position || !emp.wage) {
    return res.sendStatus(400);
  }
  // db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
  //   if (!row) {
  //     res.status(400).send();
  //   }
  //   db.run(`UPDATE Employee
  //     SET name = '${emp.name}', position = '${emp.position}', wage = ${emp.wage}, is_current_employee = 1
  //     WHERE id = ${req.params.id}`, function (err) {
  //     if (err) {
  //       return res.sendStatus(400);
  //     }
  //       db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
  //         if (err) {
  //           res.status(404).send();
  //         }
  //         else {
  //           if (row) {
  //             res.status(200).send({employee: row});
  //           }
  //           else {
  //             res.status(404).send();
  //           }
  //         }
  //       });
  //   });
  // });
  db.serialize(() => {
    db.run(`UPDATE Employee
      SET name = '${emp.name}', position = '${emp.position}', wage = ${emp.wage}, is_current_employee = 1
      WHERE id = ${req.params.id}`, function (err) {
      if (err) {
        return res.sendStatus(400);
      }
      else {
        db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
          res.status(200).send({employee: row});
        });
      }
    });
  });
});

app.delete('/api/employees/:id', (req, res, next) => {
  db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
    if (!row) {
      res.status(404).send();
    }
    db.run(`UPDATE Employee SET is_current_employee = 0 WHERE id = ${req.params.id}`,
      function (err) {
        db.get(`SELECT * FROM Employee WHERE id = ${req.params.id}`, (err, row) => {
          res.status(200).send({employee: row});
        });
      });
  });
});

app.get('/api/employees/:employeeId/timesheets', (req, res, next) => {
  db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
    if (!row) {
      res.status(404).send();
    }
    db.all(`SELECT * FROM Timesheet WHERE employee_id = ${req.params.employeeId}`, (err, rows) => {
      res.status(200).send({timesheets: rows});
    });
  });
});

app.post('/api/employees/:employeeId/timesheets', (req, res, next) => {
  // Creates a new timesheet, related to the employee with the supplied employee ID, with the information from the timesheet property of the request body
    // and saves it to the database. Returns a 201 response with the newly-created timesheet on the timesheet property of the response body
  // If an employee with the supplied employee ID doesn't exist, returns a 404 response
  const ts = req.body.timesheet;
  if (!ts.hours || !ts.rate || !ts.date) {
    return res.sendStatus(400);
  }
  db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    db.run(`INSERT INTO Timesheet (hours, rate, date, employee_id) VALUES (
      ${ts.hours}, ${ts.rate}, ${ts.date}, ${req.params.employeeId})`,
      function (err) {
        if (err) {
          return res.sendStatus(400);
        }
        db.get(`SELECT * FROM Timesheet WHERE id = ${this.lastID}`, (err, row) => {
          res.status(201).send({timesheet: row});
        });
    });
  });
});

app.put('/api/employees/:employeeId/timesheets/:timesheetId', (req, res, next) => {
  // Updates the timesheet with the specified timesheet ID using the information from the timesheet property of the request body and saves it to the database.
    // Returns a 200 response with the updated timesheet on the timesheet property of the response body
  // If any required fields are missing, returns a 400 response
  // If an employee with the supplied employee ID doesn't exist, returns a 404 response
  // If a timesheet with the supplied timesheet ID doesn't exist, returns a 404 response
  const ts = req.body.timesheet;
  if (!ts.hours || !ts.rate || !ts.date) {
    return res.sendStatus(400);
  }
  db.serialize(() => {
    db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
      if (err || !row) { return res.sendStatus(404); }
    });
    db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
      if (!row) { return res.sendStatus(404); }
    });
    db.run(`UPDATE Timesheet SET hours = ${ts.hours}, rate = ${ts.rate}, date = ${ts.date}
      WHERE id = ${req.params.timesheetId}`, function (err) {
        db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
          res.status(200).send({timesheet: row});
        });
    });
  })
    // db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
    //   if (!row) {
    //     return res.sendStatus(404);
    //   }
    //   else {
    //     db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
    //       if (!row) {
    //         return res.sendStatus(404);
    //       }
    //       else {
    //         db.run(`UPDATE Timesheet
    //           SET hours = ${ts.hours}, rate = ${ts.rate}, date = ${ts.date}
    //           WHERE employee_id = ${req.params.employeeId}`,
    //           function (err) {
    //             if (err) {
    //               return res.sendStatus(400);
    //             }
    //             else {
    //               db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
    //                 res.status(200).send({timesheet: row});
    //               });
    //             }
    //         });
    //       }
    //     });
    //   }
    // });
});

app.delete('/api/employees/:employeeId/timesheets/:timesheetId', (req, res, next) => {
  // Deletes the timesheet with the supplied timesheet ID from the database. Returns a 204 response.
  // If an employee with the supplied employee ID doesn't exist, returns a 404 response
  // If an timesheet with the supplied timesheet ID doesn't exist, returns a 404 response
  db.serialize(() => {
    db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
      if (!row) {
        return res.sendStatus(404);
      }
    });
    db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
      if (!row) {
        return res.sendStatus(404);
      }
    });
    db.run(`DELETE FROM Timesheet WHERE id = ${req.params.timesheetId}`, function (err) {
        return res.sendStatus(204);
    });
  });
  // db.get(`SELECT * FROM Employee WHERE id = ${req.params.employeeId}`, (err, row) => {
  //   if (!row) {
  //     return res.sendStatus(404);
  //   }
  //   db.get(`SELECT * FROM Timesheet WHERE id = ${req.params.timesheetId}`, (err, row) => {
  //     if (!row) {
  //       return res.sendStatus(404);
  //     }
  //     db.run(`DELETE FROM Timesheet WHERE id = ${req.params.timesheetId}`, function (err) {
  //         return res.sendStatus(204);
  //     });
  //   });
  // });
});

app.get('/api/menus', (req, res, next) => {
  // Returns a 200 response containing all saved menus on the menus property of the response body
  db.all(`SELECT * FROM Menu`, (err, rows) => {
    res.status(200).send({menus: rows});
  });
});

app.post('/api/menus', (req, res, next) => {
// Creates a new menu with the information from the menu property of the request body and saves it to the database.
  // Returns a 201 response with the newly-created menu on the menu property of the response body
// If any required fields are missing, returns a 400 response
  const newMenu = req.body.menu;
  if (!newMenu.title) {
    return res.sendStatus(400);
  }
  db.run(`INSERT INTO Menu (title) VALUES (${newMenu.title})`, function (err) {
    db.get(`SELECT * FROM Menu WHERE id = ${this.lastID}`, (err, row) => {
      res.status(201).send({menu: row});
    });
  });
});

app.get('/api/menus/:menuId', (req, res, next) => {
  // Returns a 200 response containing the menu with the supplied menu ID on the menu property of the response body
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
    if (err) {
      res.status(404).send();
    }
    else {
      if (row) {
        res.status(200).send({menu: row});
      }
      else {
        res.status(404).send();
      }
    }
  })
});

app.put('/api/menus/:menuId', (req, res, next) => {
  // Updates the menu with the specified menu ID using the information from the menu property of the request body and saves it to the database. Returns a 200 response with the updated menu on the menu property of the response body
  // If any required fields are missing, returns a 400 response
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  const newMenu = req.body.menu;
  if (!newMenu.title) {
    return res.sendStatus(400);
  }
  db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    db.run(`UPDATE Menu SET title = '${newMenu.title}' WHERE id = ${req.params.menuId}`, function (err) {
        db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
              res.status(200).send({menu: row});
        });
    });
  });
});

app.delete('/api/menus/:menuId', (req, res, next) => {
  // Deletes the menu with the supplied menu ID from the database if that menu has no related menu items. Returns a 204 response.
  // If the menu with the supplied menu ID has related menu items, returns a 400 response.
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    db.get(`SELECT * FROM MenuItem WHERE menu_id = ${req.params.menuId}`, (err, row) => {
      if (!row) {
        db.run(`DELETE FROM Menu WHERE id = ${req.params.menuId}`, function (err) {
          return res.sendStatus(204);
        });
      }
      else {
        return res.sendStatus(400);
      }
    });
  });
});

app.get('/api/menus/:menuId/menu-items', (req, res, next) => {
  // Returns a 200 response containing all saved menu items related to the menu with the supplied menu ID on the menu items property of the response body
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    db.all(`SELECT * FROM MenuItem WHERE menu_id = ${req.params.menuId}`, (err, rows) => {
      res.status(200).send({menuItems: rows});
    });
  });
});

app.post('/api/menus/:menuId/menu-items', (req, res, next) => {
  // Creates a new menu item, related to the menu with the supplied menu ID, with the information from the menuItem property of the request body
    // and saves it to the database. Returns a 201 response with the newly-created menu item on the menuItem property of the response body
  // If any required fields are missing, returns a 400 response
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  const item = req.body.menuItem;
  if (!item.name || !item.inventory || !item.price || !item.menu_id) {
    return res.sendStatus(400);
  }
  db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    db.run(`INSERT INTO MenuItem (name, description, inventory, price, menu_id)
      VALUES (${item.name}, ${item.description}, ${item.inventory}, ${item.price}, ${item.menu_id},)`, function (err) {
      db.get(`SELECT * FROM MenuItem WHERE id = ${this.lastID}`, (err, row) => {
        res.status(201).send({menuItem: row});
      });
    });
  });
});

app.put('/api/menus/:menuId/menu-items/:menuItemId', (req, res, next) => {
  // Updates the menu item with the specified menu item ID using the information from the menuItem property of the request body and saves it to the database.
    // Returns a 200 response with the updated menu item on the menuItem property of the response body
  // If any required fields are missing, returns a 400 response
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  // If a menu item with the supplied menu item ID doesn't exist, returns a 404 response
  const item = req.body.menuItem;
  if (!item.name || !item.inventory || !item.price) {
    return res.sendStatus(400);
  }
  db.get(`SELECT * FROM MenuItem WHERE id = ${req.params.menuItemId}`, (err, row) => {
    if (!row) {
      return res.sendStatus(404);
    }
    else {
      db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
        if (!row) {
          return res.sendStatus(404);
        }
        db.run(`UPDATE MenuItem SET name = '${item.name}', description = '${item.description}',
          inventory = '${item.inventory}', price = '${item.price}' WHERE id = ${req.params.menuItemId}`, function (err) {
            db.get(`SELECT * FROM MenuItem WHERE id = ${req.params.menuItemId}`, (err, row) => {
                  res.status(200).send({menuItem: row});
            });
        });
      });
    }
  });
});

app.delete('/api/menus/:menuId/menu-items/:menuItemId', (req, res, next) => {
  // Deletes the menu item with the supplied menu item ID from the database. Returns a 204 response.
  // If a menu with the supplied menu ID doesn't exist, returns a 404 response
  // If a menu item with the supplied menu item ID doesn't exist, returns a 404 response
  db.serialize(() => {
    db.get(`SELECT * FROM MenuItem WHERE id = ${req.params.menuItemId}`, (err, row) => {
      if (!row) {
        return res.sendStatus(404);
      }
    });
    db.get(`SELECT * FROM Menu WHERE id = ${req.params.menuId}`, (err, row) => {
      if (!row) {
        return res.sendStatus(404);
      }
    });
    db.run(`DELETE FROM MenuItem WHERE id = ${req.params.menuItemId}`, function (err) {
      return res.sendStatus(204);
    });
  });
});


app.listen(process.env.PORT || 4000);

module.exports = app;
