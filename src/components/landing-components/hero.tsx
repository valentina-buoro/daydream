import { Link } from "react-router-dom";
import HeroAnimation from "./hero_animation";
const Hero = () => {
  return (
    <>
     <div className="ml-auto">
        <button className=" my-5 text-sm underline p-3 px-6">Already have an account?</button>
      </div>
    <section className="flex px-[10%] py-[2.5%] gap-12 items-center h-[80vh]">
     
      <div className="w-1/2">
        <div>
          <p className="text-[#171717] font-oi text-6xl text-left mb-6">
            Welcome to <span className="hero-text">day dream drinks </span>
            wholesale
          </p>
          <p className="font-poppins text-base text-left my-4 font-normal italic ">Partner with daydream drinks. Bring more flavour to your customers...</p>
        </div>

        <div className="font-poppins flex">
          <Link to='/enquiry'>
          <button className=" bg-[#ffff] text-[#171717] px-6 py-3 rounded-2xl text-sm font-bold">
            <span className='text-base font-semibold'>Get Started</span>
            </button></Link>
          
        </div>
      </div>
      <div
        className="
      w-1/2
          rounded-[36px]
          bg-[linear-gradient(135deg,#5FCED0_0%,#669CF1_34%,#8269DC_67%,#DC87AF_100%)]
        "
      >
        <div>
          <HeroAnimation />
        </div>
      </div>
    </section></>
  );
};

export default Hero;
