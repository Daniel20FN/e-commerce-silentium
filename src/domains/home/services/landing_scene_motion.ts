type SceneMotion = {
  from: Keyframe;
  to: Keyframe;
  duration: number;
  delay: number;
};

export function getLandingSceneMotion(
  part: string | undefined,
): SceneMotion | null {
  switch (part) {
    case "room":
      return {
        from: { transform: "scale(1.08)", clipPath: "inset(0 18% 0 0)" },
        to: { transform: "none", clipPath: "inset(0)" },
        duration: 1600,
        delay: 0,
      };
    case "curtain":
      return {
        from: { transform: "translateX(-20%)" },
        to: { transform: "translateX(45%)" },
        duration: 2200,
        delay: 0,
      };
    case "product":
      return {
        from: { opacity: 0.35, transform: "translateY(55px) rotate(-12deg)" },
        to: { opacity: 1, transform: "rotate(-5deg)" },
        duration: 1000,
        delay: 250,
      };
    case "receipt":
      return {
        from: { opacity: 0.35, transform: "translateY(45px) rotate(10deg)" },
        to: { opacity: 1, transform: "rotate(4deg)" },
        duration: 1000,
        delay: 650,
      };
    case "message":
      return {
        from: { opacity: 0.35, transform: "translateY(35px) rotate(4deg)" },
        to: { opacity: 1, transform: "rotate(-2deg)" },
        duration: 1000,
        delay: 1200,
      };
    case "editorial-main":
      return {
        from: { transform: "translateX(-25px)", clipPath: "inset(0 12% 0 0)" },
        to: { transform: "none", clipPath: "inset(0)" },
        duration: 1500,
        delay: 0,
      };
    case "editorial-side":
      return {
        from: { transform: "translateY(45px)" },
        to: { transform: "none" },
        duration: 1700,
        delay: 200,
      };
    case "editorial-curtain":
      return {
        from: { transform: "translateX(-15%)" },
        to: { transform: "translateX(15%)" },
        duration: 2100,
        delay: 0,
      };
    default:
      return null;
  }
}
