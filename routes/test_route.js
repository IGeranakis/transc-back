import express from "express"
import {test} from "../controllers/test.js"

const router=express.Router();


router.get('/test',test);
// router.post('/login',Login);
// router.delete('/logout',logOut);


export default router;