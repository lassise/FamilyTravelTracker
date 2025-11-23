import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe } from "lucide-react";

interface FamilyMemberProps {
  name: string;
  role: string;
  countriesVisited: number;
  avatar: string;
  color: string;
}

const FamilyMember = ({ name, role, countriesVisited, avatar, color }: FamilyMemberProps) => {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
      <CardContent className="p-0">
        <div className={`h-2 ${color}`} />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg">
              {avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{role}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Countries</span>
              </div>
              <Badge variant="secondary" className="font-bold">
                {countriesVisited}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Explorer since 2020</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyMember;
