"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const sliderImages = [
    "/sakya-hero.png",
    "/sakya-classroom.png",
    "/sakya-library.png",
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const subjects = [
    {
      image: "/sinhala.jpg",
      title: "සිංහල භාෂාව හා සාහිත්‍යය",
      tutor: "කසුන් වෙඩිසිංහ",
      color: "from-amber-400 to-orange-500",
    },
    {
      image: "/english.jpg",
      title: "ඉංග්‍රීසි",
      tutor: "මලින් ප්‍රියනාත්",
      color: "from-blue-400 to-indigo-500",
    },
    {
      image: "/maths.jpg",
      title: "ගණිතය",
      tutor: "තාරක මධුශාල්",
      color: "from-green-400 to-emerald-500",
    },
    {
      image: "/science.jpg",
      title: "විද්‍යාව",
      tutor: "ප්‍රසාද් ප්‍රියංකර",
      color: "from-purple-400 to-violet-500",
    },
    {
      image: "/history.jpg",
      title: "ඉතිහාසය",
      tutor: "නිශාන් ප්‍රියංග",
      color: "from-red-400 to-rose-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative w-full h-[70vh] sm:h-[85vh] overflow-hidden">
        {/* Background Slider */}
        {sliderImages.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt={`Sakya Institute ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        {/* Top Logo Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sakya Logo"
              width={60}
              height={60}
              className="w-12 sm:w-[60px] h-auto drop-shadow-lg"
            />
            <span className="text-white text-lg sm:text-xl font-semibold tracking-wide drop-shadow">
              Institute of Sakya
            </span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-100px)] text-center px-4">
          <div className="mb-4">
            <Image
              src="/sipsara.png"
              alt="සක්‍ය"
              width={320}
              height={90}
              className="w-56 sm:w-[320px] h-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white drop-shadow-lg mb-2">
            අධ්‍යාපන ආයතනය
          </h1>
          <p className="text-lg sm:text-2xl text-white/90 drop-shadow mb-2">
            Institute of Sakya
          </p>
          <p className="text-base sm:text-lg text-white/75 drop-shadow max-w-xl mb-8">
            The Institute of Knowledge — Empowering Students for a Brighter Future
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row gap-4 sm:gap-6">
            <Link
              href="/login"
              className="px-6 py-3 sm:px-10 sm:py-4 text-base sm:text-xl font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 sm:px-10 sm:py-4 text-base sm:text-xl font-semibold bg-white/20 hover:bg-white/30 text-white border-2 border-white/60 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 backdrop-blur-sm transition-all duration-300"
            >
              Register
            </Link>
          </div>

          {/* Slider Dots */}
          <div className="flex gap-2 mt-10">
            {sliderImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i === currentSlide
                    ? "bg-white scale-110"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Subjects Section */}
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
            Our Subjects
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
            Explore our range of subjects taught by experienced and dedicated tutors
          </p>
          <div className="w-20 h-1 bg-emerald-500 mx-auto mt-4 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {subjects.map((subject, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
            >
              {/* Gradient Top Bar */}
              <div className={`h-2 bg-gradient-to-r ${subject.color}`} />

              <div className="p-5 flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden shadow-md">
                  <Image
                    src={subject.image}
                    alt={subject.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-gray-800 mb-1 leading-tight">
                    {subject.title}
                  </h4>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{subject.tutor}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/logo.png"
              alt="Sakya Logo"
              width={40}
              height={40}
              className="w-10 h-auto"
            />
            <span className="text-lg font-semibold">Institute of Sakya</span>
          </div>
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Institute of Sakya. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
