export const GARDEN_MUSIC_SRC = "/audio/garden-music.mp3";

export interface GardenPhotoItem {
  id: number;
  src: string;
  caption?: string;
  side: "left" | "right";
}

// Edit captions or filenames here, or trim the array to use fewer photographs.
export const GARDEN_PHOTOS: GardenPhotoItem[] = [
  { id: 1, src: "/gallery/01.jpg", caption: "  يا بخت حياتي بحياتي ♡", side: "left" },
  { id: 2, src: "/gallery/02.jpg", caption: " قلبي يا ناس  ", side: "right" },
  { id: 3, src: "/gallery/03.jpg", caption: "  اول احبك", side: "left" },
  { id: 4, src: "/gallery/04.jpg", caption: " ضحكة تشرح قلبي  ", side: "right" },
  { id: 5, src: "/gallery/05.jpg", caption: "  قمر بيضحك يا ناس ", side: "left" },
  { id: 6, src: "/gallery/06.jpg", caption: " عمري ما حنسى احساس الصورة دي حبيبي لما تبادلنا النظارات ", side: "right" },
  { id: 7, src: "/gallery/07.jpg", caption: " حبيبي الحلو اللي اموت في ضحكته يومها كنا ماتشي ماتشي 😂❤️ ", side: "left" },
  { id: 8, src: "/gallery/08.jpg", caption: "  متذكر هنا حبيبي كنت براضي فيك و باين اني نجحت 😂❤️❤️ ", side: "right" },
  { id: 9, src: "/gallery/09.jpg", caption: " يوم كسرت حنك الشباب و طلعت مع حبيب قلبي ", side: "left" },
  { id: 10, src: "/gallery/10.jpg", caption: " هنا حبيبي كان جاهم امتحان صعب و مشيت اهدي قلبي و عزمتها ماتشا و في الاخير جابت قريد حلو الحفارة😂❤️ ", side: "right" },
  { id: 11, src: "/gallery/11.jpg", caption: "  حبيبي هنا كان عايز شي الصباح و نزلت ليه بالبجامة ", side: "left" },
  { id: 12, src: "/gallery/12.jpg", caption: "  ده اول يوم تدريب لي حبيبي في السمر. و قلبي ضيعت الفيست حقها 😂❤️ ", side: "right" },
  { id: 13, src: "/gallery/13.jpg", caption: " يوم تاني حبيب قلبي كان مبسوط فيه ", side: "left" },
  { id: 14, src: "/gallery/14.jpg", caption: " هنا يوم مشيت مع قلبي كي اف سي عشان نجيب العرض حقهم ", side: "right" },
  { id: 15, src: "/gallery/15.jpg", caption: " قلبي الحلو لما كان  نفسها في عياد شمس و لقته قدامها. لبيتها فلبي انا ", side: "left" },
  { id: 16, src: "/gallery/16.jpg", caption: " يوم ساي قلبي كان مبسوط فيه  ", side: "right" },
  { id: 17, src: "/gallery/17.jpg", caption: "  ما عارفها قالت لي شنو لكن كنت اوفر فاصل❤️ ", side: "left" },
  { id: 18, src: "/gallery/18.jpg", caption: " حبيبي و هي شايلة مشروعها الاطول منها 😂❤️ ", side: "right" },
  { id: 19, src: "/gallery/19.jpg", caption: " حبيب كل ايامي و ازماني  ", side: "left" },
  { id: 20, src: "/gallery/20.jpg", caption: "  حبيبي خارق الجمال و هو مبسوط كالعادة  ", side: "right" },
];
