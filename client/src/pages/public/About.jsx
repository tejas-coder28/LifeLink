import React from 'react';
import { HeartHandshake, ShieldCheck, Cpu, Code2, Database, Layers } from 'lucide-react';
import Card from '../../components/common/Card';

const About = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">About LifeLink Architecture</h1>
        <p className="text-black text-sm max-w-2xl mx-auto">
          LifeLink is built as a 3-tier modular monolith + dedicated AI Service Layer, delivering high-speed emergency donor matching with full transparency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Frontend Layer" icon={Layers}>
          <ul className="space-y-2 text-xs text-black">
            <li>• React 18 + Vite for high-performance frontend rendering</li>
            <li>• Tailwind CSS for rich modern medical dark styling</li>
            <li>• Recharts for live dashboard analytics visualization</li>
            <li>• Axios Client with JWT header interceptors</li>
          </ul>
        </Card>

        <Card title="Backend API Gateway" icon={Code2}>
          <ul className="space-y-2 text-xs text-black">
            <li>• Express.js REST API with modular domain services</li>
            <li>• JWT authentication & Role-Based Access Control (RBAC)</li>
            <li>• Zod request body validation on every mutating route</li>
            <li>• Rate limiting with stricter caps on `/api/ai/*`</li>
          </ul>
        </Card>

        <Card title="Data Layer" icon={Database}>
          <ul className="space-y-2 text-xs text-black">
            <li>• MongoDB Atlas with Mongoose ODM schemas</li>
            <li>• `2dsphere` spatial indexing on DonorProfiles & Requests</li>
            <li>• In-memory MongoDB server fallback for zero-config dev</li>
          </ul>
        </Card>

        <Card title="Matching Engine & AI" icon={Cpu}>
          <ul className="space-y-2 text-xs text-black">
            <li>• Pure functional scoring algorithm (0-100% match score)</li>
            <li>• Recipient blood compatibility matrix check</li>
            <li>• LLM API integration with heuristic fallback engine</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default About;
