import { motion } from "motion/react";

const cans = [
  {
    src: "/images/blackberry.webp",
    alt: "Daydream Blackberry Chai",
    x: -145,
    y: 18,
    rotate: -13,
    delay: 0,
  },
  {
    src: "/images/cucumber.webp",
    alt: "Daydream Cucumber Lime",
    x: -52,
    y: -12,
    rotate: -5,
    delay: 0.12,
  },
  {
    src: "/images/peach.webp",
    alt: "Daydream Peach Ginger",
    x: 52,
    y: -8,
    rotate: 6,
    delay: 0.24,
  },
  {
    src: "/images/paloma.webp",
    alt: "Daydream Passionfruit Paloma",
    x: 145,
    y: 18,
    rotate: 13,
    delay: 0.36,
  },
];

export default function HeroAnimation() {
  return (
    <div className="relative font-poppins flex min-h-[520px] w-full items-center justify-center overflow-hidden">
      
      {/* Soft glow */}
      <div
        className="
          absolute left-1/2 top-1/2
          h-[420px] w-[420px]
          -translate-x-1/2 -translate-y-1/2
          rounded-full bg-white/20 blur-[70px]
        "
      />

      {/* Order notification */}
      <motion.div
        initial={{
          opacity: 0,
          y: 30,
          scale: 0.9,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          delay: 1,
          duration: 0.6,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="
          absolute top-8 z-30
          flex items-center gap-3
          rounded-2xl border border-white/50
          bg-white/90 px-5 py-3
          shadow-xl backdrop-blur-xl
        "
      >
        <div
          className="
            flex h-9 w-9 items-center justify-center
            rounded-full bg-[#D9F8E9]
            text-sm font-bold text-[#24664A]
          "
        >
          ✓
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/40">
            Wholesale order
          </p>

          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-[#171717]">
              Order placed
            </p>

            <span className="text-sm font-medium text-black/50">
              $384.00
            </span>
          </div>
        </div>
      </motion.div>

      {/* Cans */}
      <div className="relative z-20 h-[360px] w-[430px]">
        {cans.map((can, index) => (
          <motion.div
            key={can.src}
            className="absolute left-1/2 top-1/2"
            initial={{
              x: can.x,
              y: 180,
              opacity: 0,
              scale: 0.75,
              rotate: can.rotate,
            }}
            animate={{
              x: can.x,
              y: [
                can.y,
                can.y - (index % 2 === 0 ? 9 : 13),
                can.y,
              ],
              opacity: 1,
              scale: 1,
              rotate: [
                can.rotate,
                can.rotate + (index % 2 ? 1.5 : -1.5),
                can.rotate,
              ],
            }}
            transition={{
              opacity: {
                delay: can.delay,
                duration: 0.5,
              },

              scale: {
                delay: can.delay,
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              },

              y: {
                delay: can.delay,
                duration: 4 + index * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              },

              rotate: {
                delay: can.delay,
                duration: 5 + index * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            style={{
              marginLeft: -72,
              marginTop: -135,
              zIndex: index === 1 || index === 2 ? 20 : 10,
            }}
          >
            <img
              src={can.src}
              alt={can.alt}
              className="
                w-[145px]
                select-none
                drop-shadow-[0_30px_25px_rgba(37,27,66,0.18)]
              "
              draggable="false"
            />
          </motion.div>
        ))}
      </div>

      {/* Wholesale label */}
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.8,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          delay: 0.8,
          duration: 0.5,
        }}
        className="
          absolute bottom-[92px] z-10
          rounded-full border border-white/40
          bg-white/25 px-6 py-2
          text-xs font-semibold uppercase
          tracking-[0.18em] text-white
          backdrop-blur-md
        "
      >
        Daydream Wholesale
      </motion.div>

      {/* Order quantity */}
      <motion.div
        animate={{
          y: [0, -7, 0],
          rotate: [-2, 1, -2],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          absolute bottom-16 left-4 z-40
          rounded-2xl bg-[#E9E1FF]
          px-4 py-3
          shadow-xl
        "
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#645A7D]">
          Your order
        </p>

        <p className="mt-0.5 text-sm font-semibold text-[#372C51]">
          4 cases · 48 cans
        </p>
      </motion.div>

      {/* Payment notification */}
      <motion.div
        initial={{
          opacity: 0,
          x: 35,
          scale: 0.85,
        }}
        animate={{
          opacity: [0, 1, 1, 0],
          x: [35, 0, 0, 20],
          scale: [0.85, 1, 1, 0.95],
        }}
        transition={{
          delay: 1.6,
          duration: 4.5,
          times: [0, 0.15, 0.82, 1],
          repeat: Infinity,
          repeatDelay: 2,
          ease: "easeOut",
        }}
        className="
          absolute bottom-8 right-4 z-40
          rounded-2xl border border-black/5
          bg-white px-4 py-3
          shadow-xl
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex h-9 w-9 items-center justify-center
              rounded-full bg-[#D9F8E9]
              font-bold text-[#287153]
            "
          >
            ✓
          </div>

          <div>
            <p className="text-xs font-semibold text-[#171717]">
              Payment received
            </p>

            <p className="mt-0.5 text-[10px] text-black/40">
              Wholesale order #1042
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}