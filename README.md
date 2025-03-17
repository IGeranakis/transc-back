# backend_template

### Getting started

1.Create a config/database.js file

2.Add this to connect to mysql db:
  ```sh
  import { Sequelize } from "sequelize";
  
  const db=new Sequelize('pmanage','root','',{
  host:"localhost",
  dialect:"mysql",
  port:3306
  });

  export default db;
  ```
3.Install dependencies:
  ```sh 
  npm install 
  ```
  
4.Run backend:
  ```sh 
  npm run dev 
  ```
