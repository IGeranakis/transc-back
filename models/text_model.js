// models/Text.js
import { Sequelize } from "sequelize";
import db from "../config/database.js";
import Users from "./user_model.js";

const { DataTypes } = Sequelize;

const Text = db.define('text', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name:{
    type: DataTypes.STRING,
    allowNull: false,
    validate:{
        notEmpty: true,
        len: [3, 500]
    }
},
  corrected_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Users,
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  freezeTableName: true
});

export default Text;
