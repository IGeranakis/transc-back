import e from "express";
import Users from "../models/user_model.js";
import Text from "../models/text_model.js";

// GET: Get all transcriptions for a user
export const getAllTextsForUser = async (req, res) => {
    const { uuid } = req.params;
  
    try {
      const user = await Users.findOne({ where: { uuid } });
      if (!user) return res.status(404).json({ msg: "User not found" });
  
      const texts = await Text.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']]
      });
  
      res.status(200).json(texts);
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  };
  
  // PATCH: Update corrected_text and/or summary
  export const updateText = async (req, res) => {
    const { textId } = req.params;
    const { corrected_text, summary } = req.body;
  
    try {
      const text = await Text.findOne({ where: { id: textId } });
      if (!text) return res.status(404).json({ msg: "Text not found" });
  
      await Text.update(
        { corrected_text, summary },
        { where: { id: textId } }
      );
  
      res.status(200).json({ msg: "Text updated successfully" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  };
  
  // DELETE: Delete a transcription
  export const deleteText = async (req, res) => {
    const { textId } = req.params;
  
    try {
      const text = await Text.findOne({ where: { id: textId } });
      if (!text) return res.status(404).json({ msg: "Text not found" });
  
      await Text.destroy({ where: { id: textId } });
  
      res.status(200).json({ msg: "Text deleted successfully" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  };