import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const Airphonic = () => {
    const [particles, setParticles] = useState([]);
    const [location, setLocation] = useState('BKK'); // Toggle between BKK and HK

    // Simulated AQI data - in real app, this would come from an API
    const aqiData = {
        BKK: { pm25: 45, pm10: 80 },
        HK: { pm25: 30, pm10: 55 }
    };

    // Audio context setup
    const [audioContext] = useState(() => new (window.AudioContext || window.webkitAudioContext)());

    const createTone = useCallback((frequency, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = location === 'BKK' ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    }, [audioContext, location]);

    const handleClick = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate frequency based on position and air quality
        const baseFrequency = 220; // A3 note
        const aqi = aqiData[location].pm25;
        const frequency = baseFrequency * (1 + (y / rect.height)) * (1 + (aqi / 100));

        // Create new particle
        const newParticle = {
            id: Date.now(),
            x,
            y,
            color: aqi > 50 ? 'red' : aqi > 30 ? 'yellow' : 'green'
        };

        setParticles(prev => [...prev, newParticle]);
        createTone(frequency, 2);
    }, [createTone, location, aqiData]);

    // Auto-play when idle
    useEffect(() => {
        let intervalId;
        const idleTimeout = setTimeout(() => {
            intervalId = setInterval(() => {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                handleClick({ currentTarget: document.body, clientX: x, clientY: y });
            }, 2000);
        }, 5000);

        return () => {
            clearTimeout(idleTimeout);
            clearInterval(intervalId);
        };
    }, [handleClick]);

    return (
        <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
            <button
                onClick={() => setLocation(prev => prev === 'BKK' ? 'HK' : 'BKK')}
                className="absolute top-4 right-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
                {location}
            </button>

            <div
                className="w-full h-full cursor-pointer"
                onClick={handleClick}
            >
                {particles.map(particle => (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-full"
                        initial={{
                            width: 20,
                            height: 20,
                            x: particle.x,
                            y: particle.y,
                            opacity: 0.8
                        }}
                        animate={{
                            width: 100,
                            height: 100,
                            opacity: 0
                        }}
                        transition={{ duration: 2 }}
                        style={{
                            backgroundColor: particle.color,
                            left: -50,
                            top: -50
                        }}
                    />
                ))}
            </div>

            <div className="absolute bottom-4 left-4 text-white">
                <div>PM2.5: {aqiData[location].pm25}</div>
                <div>PM10: {aqiData[location].pm10}</div>
            </div>
        </div>
    );
};

export default Airphonic;
