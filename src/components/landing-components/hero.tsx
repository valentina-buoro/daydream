import { Link } from "react-router-dom";
import HeroAnimation from "./hero_animation";
import '../../index.css'
const Hero = () => {
  return (
    <>
     <div className="ml-auto">
        <Link to="/login" className="my-5 inline-block text-sm underline p-3 px-6">Already have an account?</Link>
      </div>
    <section className="flex flex-col px-[6%] py-10 gap-12 items-center lg:min-h-[80vh] lg:flex-row lg:px-[10%]">
     
      <div className="w-full lg:w-1/2">
        <div>
          <p className="font-athletics font-extrabold text-[#171717] text-4xl sm:text-6xl text-left mb-6">
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
      w-full lg:w-1/2
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
