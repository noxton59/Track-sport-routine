import DataStore from "@seald-io/nedb";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening to ${port}`));
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }))

const dataBase = new DataStore({ filename: "dataBase.db", autoload: true});
dataBase.setAutocompactionInterval(30000);

app.post("/api/addUser", (request, response) => {
  const data = request.body;
  dataBase.insert(data);
  response.json("success");
})

app.post("/api/:user", async (request, response) => {
  const userLogin = request.params.user;
  await dataBase.updateAsync({ login: userLogin}, { $push: {routine: request.body}}, {});
  dataBase.find({login: userLogin}, (err, data)=>{
    if (err) {
      console.log(err)
    } else {
      response.json(data[0].routine)
    }
  })
})

app.put("/api/:user/:id", async (request, response) => {
  const userLogin = request.params.user;
  const exerId = request.params.id;
  const {newSets, newReps} = request.body;

  dataBase.findOne({ login: userLogin }, (err, doc) => {
    if (err) {
      response.json("User was not found");
      return;
    }
    if (doc) {
      const index = doc.routine.findIndex(item => item.id == exerId);
      if (index !== -1) {
        doc.routine[index].reps = newReps;
        doc.routine[index].sets = newSets;
        dataBase.update({ login: userLogin }, doc, {});
      }
    }
    dataBase.find({login: userLogin}, (err, data)=>{
      if (err) {
        console.log(err)
      } else {
        response.json(data[0].routine)
      }
    })
  });

})

app.put("/api/changeName/:login/:names", async (request, response) => {
  const login = request.params.login;
  const names = request.params.names.split("&");
  await dataBase.updateAsync({login: login}, {$set: {firstName: names[0], secondName: names[1]}});
  response.json("name changed");
})

app.put("/api/changePass/:loginPass/:newPass", async (request, response) => {
  const inputData = request.params.loginPass.split("&");
  const newPass = request.params.newPass;
  const login = inputData[0];
  const prevPass = inputData[1];
  dataBase.findOne({login: login}, async (err, doc) => {
    if (doc.password === prevPass) {
      await dataBase.updateAsync({login: login}, {$set: {password: newPass}});
      response.json("password changed");
    } else if (err) {
      response.json(err);
    } else {
      response.json("prevPass doesn't match");
    }
  })
})

app.delete("/api/:user", async (request, response) => {
  const userLogin = request.params.user;
  await dataBase.removeAsync({login: userLogin}, {});
  response.json({
    status: "user deleted"
  })
})

app.delete("/api/deleteHS/:user", async (request, response) => {
  const userLogin = request.params.user;
  await dataBase.updateAsync({login: userLogin}, {$set: { routine: []}});
  dataBase.find({login: userLogin}, (err, data)=>{
    if (err) {
      console.log(err)
    } else {
      response.json(data[0].routine)
    }
  });
})

app.get("/api/:loginPass", (request, response) => {
  const loginPass = request.params.loginPass.split("&");
  const login = loginPass[0];
  const pass = loginPass[1];
  dataBase.find({login: login}, (err, data) => {
    if (data.length === 0) {
      response.json("no user")
    } else {
      if (data[0].password === pass) {
        const {login, firstName, secondName, routine} = data[0];
        response.json(["match", login, firstName, secondName, routine]);
      } else {
        response.json("wrong password");
      }
    }
  })
})

app.get("/api/checkLogin/:login", (request, response) => {
  const login = request.params.login;
  dataBase.find({login: login}, (err, data) => {
    if (data.length === 0) {
      response.json("dobro")
    } else {
      response.json("user exists");
    }
  })
})


app.delete("/api/:user/:id", async (request, response)=>{
  const userLogin = request.params.user;
  const exerId = Number(request.params.id);
  await dataBase.updateAsync({ login: userLogin }, { $pull: {routine: {id: exerId}}}, {});
  dataBase.find({login: userLogin}, (err, data)=>{
    if (err) {
      console.log(err)
    } else {
      response.json(data[0].routine)
    }
  });
})