import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, Plus, Trash2, CheckCircle2, Circle, 
  Sparkles, Mountain, Camera, Utensils, Compass,
  Pin, Baby, ChevronDown, Star, Filter, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface BucketListItem {
  id: string;
  title: string;
  category: 'adventure' | 'food' | 'landmark' | 'experience' | 'other';
  completed: boolean;
  country?: string;
  pinned?: boolean;
  kidFriendly?: boolean;
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

const defaultItems: BucketListItem[] = [
  { id: '1', title: 'See the Northern Lights', category: 'experience', completed: false, country: 'Iceland', kidFriendly: true },
  { id: '2', title: 'Visit Machu Picchu', category: 'landmark', completed: false, country: 'Peru', kidFriendly: false },
  { id: '3', title: 'Safari in Africa', category: 'adventure', completed: false, country: 'Kenya', kidFriendly: true },
  { id: '4', title: 'Eat authentic sushi in Tokyo', category: 'food', completed: false, country: 'Japan', kidFriendly: true },
  { id: '5', title: 'Walk the Great Wall of China', category: 'landmark', completed: false, country: 'China', kidFriendly: false },
  { id: '6', title: 'Dive the Great Barrier Reef', category: 'adventure', completed: false, country: 'Australia', kidFriendly: false },
  { id: '7', title: 'Watch sunset at Santorini', category: 'experience', completed: false, country: 'Greece', kidFriendly: true },
  { id: '8', title: 'Visit the Pyramids of Giza', category: 'landmark', completed: false, country: 'Egypt', kidFriendly: true },
  { id: '9', title: 'Try street food in Bangkok', category: 'food', completed: false, country: 'Thailand', kidFriendly: true },
  { id: '10', title: 'Hike to Everest Base Camp', category: 'adventure', completed: false, country: 'Nepal', kidFriendly: false },
  { id: '11', title: 'Explore the Amazon Rainforest', category: 'adventure', completed: false, country: 'Brazil', kidFriendly: false },
  { id: '12', title: 'Visit the Taj Mahal', category: 'landmark', completed: false, country: 'India', kidFriendly: true },
  { id: '13', title: 'Cruise the Norwegian Fjords', category: 'experience', completed: false, country: 'Norway', kidFriendly: true },
  { id: '14', title: 'Eat pasta in Rome', category: 'food', completed: false, country: 'Italy', kidFriendly: true },
  { id: '15', title: 'See cherry blossoms in Kyoto', category: 'experience', completed: false, country: 'Japan', kidFriendly: true },
];

const EnhancedBucketList = () => {
  const [items, setItems] = useState<BucketListItem[]>(defaultItems);
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BucketListItem['category']>('experience');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isKidFriendly, setIsKidFriendly] = useState(false);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<BucketListItem['category'] | 'all'>('all');
  const [showKidFriendlyOnly, setShowKidFriendlyOnly] = useState(false);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const pinnedItems = items.filter(i => i.pinned && !i.completed);

  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const togglePin = (id: string) => {
    const currentPinnedCount = items.filter(i => i.pinned && i.id !== id).length;
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, pinned: currentPinnedCount < 2 ? !item.pinned : false } 
        : item
    ));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, {
      id: Date.now().toString(),
      title: newItem,
      category: selectedCategory,
      completed: false,
      kidFriendly: isKidFriendly,
    }]);
    setNewItem('');
    setIsKidFriendly(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Apply filters
  const filteredItems = items.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (showKidFriendlyOnly && !item.kidFriendly) return false;
    if (showCompletedOnly && !item.completed) return false;
    return true;
  });

  // Sort: pinned first, then incomplete, then completed
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    return 0;
  });

  const visibleItems = isExpanded ? sortedItems : sortedItems.slice(0, 8);
  
  const hasActiveFilters = filterCategory !== 'all' || showKidFriendlyOnly || showCompletedOnly;
  
  const clearFilters = () => {
    setFilterCategory('all');
    setShowKidFriendlyOnly(false);
    setShowCompletedOnly(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Travel Bucket List
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm font-medium">
              {Math.round(progress)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{items.length}
            </span>
          </div>
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

        {/* Pinned "Next Up" section */}
        {pinnedItems.length > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Next Up</span>
            </div>
            <div className="space-y-1">
              {pinnedItems.map(item => {
                const Icon = categoryIcons[item.category];
                return (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <Icon className={cn("h-3.5 w-3.5", categoryColors[item.category])} />
                    <span className="text-foreground">{item.title}</span>
                    {item.kidFriendly && (
                      <Baby className="h-3 w-3 text-accent" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filter:</span>
          </div>
          <div className="flex gap-1">
            <Badge
              variant={filterCategory === 'all' ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilterCategory('all')}
            >
              All
            </Badge>
            {Object.entries(categoryIcons).map(([cat, Icon]) => (
              <Badge
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                className="cursor-pointer text-xs gap-1"
                onClick={() => setFilterCategory(cat as BucketListItem['category'])}
              >
                <Icon className="h-3 w-3" />
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox 
                checked={showKidFriendlyOnly} 
                onCheckedChange={(checked) => setShowKidFriendlyOnly(checked as boolean)}
                className="h-3.5 w-3.5"
              />
              <Baby className="h-3 w-3" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox 
                checked={showCompletedOnly} 
                onCheckedChange={(checked) => setShowCompletedOnly(checked as boolean)}
                className="h-3.5 w-3.5"
              />
              <CheckCircle2 className="h-3 w-3" />
            </label>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
        
        {/* Filter results count */}
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground">
            Showing {filteredItems.length} of {items.length} items
          </p>
        )}
        
        {/* Add new item */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a travel dream..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-1"
            />
            <Button onClick={addItem} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Object.entries(categoryIcons).map(([cat, Icon]) => (
                <Button
                  key={cat}
                  size="icon"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat as BucketListItem['category'])}
                  className="h-8 w-8"
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox 
                checked={isKidFriendly} 
                onCheckedChange={(checked) => setIsKidFriendly(checked as boolean)}
              />
              <Baby className="h-3.5 w-3.5" />
              Kid-friendly
            </label>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = categoryIcons[item.category];
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-lg transition-all",
                  item.completed ? "bg-primary/5 opacity-60" : "bg-muted/50 hover:bg-muted",
                  item.pinned && !item.completed && "ring-1 ring-primary/30"
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
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </p>
                    {item.kidFriendly && (
                      <Baby className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                    )}
                  </div>
                  {item.country && (
                    <p className="text-xs text-muted-foreground">{item.country}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", item.pinned && "text-primary opacity-100")}
                    onClick={() => togglePin(item.id)}
                    disabled={item.completed}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length > 8 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : `View all ${filteredItems.length} items`}
            <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        )}

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

export default EnhancedBucketList;
