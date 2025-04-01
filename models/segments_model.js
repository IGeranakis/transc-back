// models/Segment.js
import { Sequelize } from "sequelize";
import db from "../config/database.js";
import Text from "./text_model.js";

const { DataTypes } = Sequelize;

const Segment = db.define('segment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  segment: {
    type: DataTypes.STRING,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  textId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Text,
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  freezeTableName: true
});

// Associations
// Text.hasMany(Segment, { foreignKey: 'textId' });
// Segment.belongsTo(Text, { foreignKey: 'textId' });

export default Segment;



