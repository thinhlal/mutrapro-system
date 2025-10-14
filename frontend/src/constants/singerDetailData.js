// src/constants/singerDetailData.js

// Dữ liệu này đóng vai trò là "khuôn mẫu" cho trang chi tiết ca sĩ.
// Các thông tin cơ bản như Tên, Ảnh, Vai trò, Địa điểm sẽ được truyền động
// từ component SingerCard và ghi đè lên các giá trị mặc định (nếu có).

export const SINGER_DETAIL_DATA = {
  // --- Các thuộc tính động đã được xóa đi (name, roles, rating, location, image) ---
  // vì chúng được cung cấp bởi `singerData` truyền qua `state`.

  reviewsCount: 968,
  verifiedReviewsCount: 162,
  profile: {
    about: [
      '"Currently booking NOVEMBER dates" Versatile expert vocalist and arranger. Worked with Stargate, Louis The Child, RAC and contributed to releases on Monstercat, Universal, and more. My own sync placements on CW, NBC, HBO, HULU, Netflix and more. Worked with Soave, One Seven, Future House Cloud etc. I also write K-Pop and have cuts with ITZY and more. My style is R&B, Rock, Dance, Pop, and Epic Cinematic Trailer Music. I use a Manley Cardioid Mic, Apollo Twin, and Logic Pro. Send me your track for custom vocals!',
      "Starting price is $300 for lead vocal recording.",
      "Once you approve and release funds, I will send all stems as WAV 48khz files (dry/raw, doubles/harmonies and adlibs, plus a rough mix).",
      "*1 Free revision round is included. Revisions are a handful of small changes, not a re-recording. I offer re-recordings at a discounted rate. Re-recordings are needed for changes like a new melody, new lyrics, etc.",
      "The songwriting price is a vocal fee and does not void my right to royalties unless we agree to a buyout.",
      "Send me a note through the contact button down.",
    ],
    credits: [
      "One Seven Music",
      "Future House Cloud",
      "Soave",
      "Hulu",
      "NBC",
      "HBO",
      "Monstercat",
      "Universal Music",
      "Warner Chappell",
      "Stargate",
      "Louis The Child",
    ],
    soundsLike: ["New Soul", "Indie", "Neo-Techno", "Rnb"],
    languages: ["English"],
  },
  audioSamples: [
    {
      id: 1,
      title: "Dance Sampler",
      genre: "Pop singer, songwriter, topliner in this style",
    },
    { id: 2, title: "Pop Urban Sampler", genre: "R&B, Pop, Soul" },
    { id: 3, title: "Epic Trailer Cinematic Sampler", genre: "Trailer music" },
  ],
  sidebar: {
    genres: [
      "Pop",
      "R&B",
      "Electronic",
      "Soul",
      "Singer Songwriter",
      "Soundtrack",
      "Trap",
    ],
    vocalStyle: ["Dua Lipa", "Katy Perry", "Doja Cat"],
    turnaroundTime: "3 days",
    ownershipSplit:
      "I retain 50% of songs I write, unless we negotiate otherwise...",
    gear: ["Manley Studio Reference Microphone", "Universal Audio Apollo Twin"],
  },
  reviews: [
    {
      id: 1,
      name: "Christian B.",
      rating: 5,
      isVerified: true,
      comment:
        "Kimera was very good & has a great texture of my track. Timely and clear communication. Everything you expect from a professional. Ask for her again!",
    },
    {
      id: 2,
      name: "Andrew L.",
      rating: 5,
      isVerified: true,
      comment:
        "I came back to Kimera once again and it was a seamless pleasure! I needed some lyric changes for a song and Kimera was not only amenable to changes but delivered perfectly and the tone matched absolutely perfectly. I can't recommend Kimera highly enough!",
    },
    {
      id: 3,
      name: "Howard M.",
      rating: 5,
      isVerified: true,
      comment:
        "Wow, Kimera can really pick up on and mirror the nuances of the intonation. So impressed and she is equally as quick and pleasant to work with, no drama!",
    },
  ],
};
