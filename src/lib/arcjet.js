import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

import { ENV } from "./env.js";

const aj = arcjet({
  key: ENV.ARCJET_KEY,
  rules: [
   //seguridadd, ataques como inyección en SQL
    shield({ mode: "LIVE" }),
    //CReación de 
    detectBot({
      mode: "LIVE", 
      //bloqueo de bots excepto
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
       
      ],
    }),
    
    slidingWindow({
      mode: "LIVE", 
      max: 100,
      interval: 60,
    }),
  ],
});

export default aj;