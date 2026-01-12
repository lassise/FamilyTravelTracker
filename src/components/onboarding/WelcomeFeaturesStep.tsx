import { Globe, Users, Map, Sparkles, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Globe,
    title: "Track Countries Visited",
    description: "Log every country you've explored",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Solo or Group Travel",
    description: "Track just yourself or add travel companions",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Map,
    title: "Interactive World Map",
    description: "Visualize your travels with a beautiful, interactive map",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Sparkles,
    title: "AI Trip Planner",
    description: "Get personalized itineraries based on your preferences",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Calendar,
    title: "Trip Planning",
    description: "Organize bookings, packing lists, and day-by-day itineraries",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: Trophy,
    title: "Travel Achievements",
    description: "Unlock badges and track milestones as you explore the world",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const WelcomeFeaturesStep = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground">
          Your travel journey starts here. Here's what you can do:
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {features.map((feature) => (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
          >
            <div className={`p-2 rounded-lg ${feature.bgColor}`}>
              <feature.icon className={`w-5 h-5 ${feature.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Let's get you set up in just a few quick steps! ✈️
        </p>
      </div>
    </div>
  );
};

export default WelcomeFeaturesStep;
