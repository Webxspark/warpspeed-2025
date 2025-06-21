import { Button } from "../components/ui/button"

const Home = () => {
    return (
        <div className="bg-gradient-to-b from-white to-blue-50">
            <div className="container mx-auto px-4 py-20 min-h-[82vh] flex items-center justify-center">
                <div className="max-w-3xl text-center">
                    <h1 className="text-5xl font-bold mb-6 text-gray-800 leading-tight">
                        Revolutionizing Client Onboarding with <span className="text-blue-600">AI</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                        We replace outdated forms and lengthy onboarding calls with intelligent,
                        conversational AI that makes the process seamless for everyone.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <a href="/about" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl">
                            Learn More
                        </a>
                        <a href="/contact" className="bg-white hover:bg-gray-100 text-blue-600 font-medium px-8 py-3 rounded-lg border border-blue-200 transition-all shadow hover:shadow-md">
                            Contact Us
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;