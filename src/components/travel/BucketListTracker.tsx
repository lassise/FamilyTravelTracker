import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Target, Plus, Trash2, CheckCircle2, Circle, 
  Sparkles, Mountain, Camera, Utensils, Compass
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BucketListItem {
  id: string;
  title: string;
  category: 'adventure' | 'food' | 'landmark' | 'experience' | 'other';
  completed: boolean;
  country?: string;
}

const categoryIcons = {
  adventure: Mountain,
  food: Utensils,
  landmark: Camera,
  experience: Sparkles,
  other: Compass,
};

const categoryColors = {
  adventure: 'text-orange-500',
  food: 'text-green-500',
  landmark: 'text-blue-500',
  experience: 'text-purple-500',
  other: 'text-muted-foreground',
};

const BucketListTracker = () => {
  const [items, setItems] = useState<BucketListItem[]>([
    { id: '1', title: 'See the Northern Lights', category: 'experience', completed: false, country: 'Iceland' },
    { id: '2', title: 'Visit Machu Picchu', category: 'landmark', completed: false, country: 'Peru' },
    { id: '3', title: 'Safari in Africa', category: 'adventure', completed: false, country: 'Kenya' },
    { id: '4', title: 'Eat authentic sushi in Tokyo', category: 'food', completed: false, country: 'Japan' },
    { id: '5', title: 'Walk the Great Wall of China', category: 'landmark', completed: false, country: 'China' },
  ]);
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BucketListItem['category']>('experience');

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, {
      id: Date.now().toString(),
      title: newItem,
      category: selectedCategory,
      completed: false,
    }]);
    setNewItem('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Travel Bucket List
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {completedCount}/{items.length} completed
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a travel dream..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1"
          />
          <div className="flex gap-1">
            {Object.entries(categoryIcons).map(([cat, Icon]) => (
              <Button
                key={cat}
                size="icon"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat as BucketListItem['category'])}
                className="h-9 w-9"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button onClick={addItem} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Items list */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {items.map((item) => {
            const Icon = categoryIcons[item.category];
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  item.completed ? "bg-primary/5" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <button onClick={() => toggleItem(item.id)} className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <Icon className={cn("h-4 w-4 flex-shrink-0", categoryColors[item.category])} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm truncate",
                    item.completed && "line-through text-muted-foreground"
                  )}>
                    {item.title}
                  </p>
                  {item.country && (
                    <p className="text-xs text-muted-foreground">{item.country}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Start adding your travel dreams!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BucketListTracker;
