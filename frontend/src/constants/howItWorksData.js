// src/constants/howItWorksData.js
// Dữ liệu cho How It Works section

import Icon1 from "../assets/icons/HowItWork/hinhwork1.svg";
import Icon2 from "../assets/icons/HowItWork/hinhwork2.svg";
import Icon3 from "../assets/icons/HowItWork/hinhwork3.svg";
import Icon4 from "../assets/icons/HowItWork/hinhwork4.svg";
import Icon5 from "../assets/icons/HowItWork/hinhwork5.svg";

export const HOW_IT_WORKS_STEPS = [
  {
    id: 1,
    title: "You request a quote",
    body: [
      "Send us the music you want us to transcribe (an audio file or a YouTube link!) and give us all relevant information: instruments, timestamps, difficulty, and arrangement details.",
    ],
  },
  {
    id: 2,
    title: "We assess and adapt",
    body: [
      "We are all music transcribers: we will listen to your music and get back to you with a price quote that suits your needs. An in-house specialist is always ready to take care of your project.",
    ],
  },
  {
    id: 3,
    title: "You place the order",
    body: [
      "When all details and price quote have been agreed on, you will place your order securely to get us started.",
    ],
  },
  {
    id: 4,
    title: "We transcribe",
    body: [
      "Our professional transcribers will craft your transcription as agreed. We will ensure the process is smooth and keep you updated if we have news or questions.",
    ],
  },
  {
    id: 5,
    title: "You enjoy the music – 100% satisfaction",
    body: [
      "We will send you the completed transcription in all the formats you need to print it or use it.",
      "We will make sure everything looks good to you. Adjusting any small details that might have been missed is our job too.",
    ],
  },
];

export const HOW_IT_WORKS_ICONS = [Icon1, Icon2, Icon3, Icon4, Icon5];
