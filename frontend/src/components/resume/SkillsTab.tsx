import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2 } from "lucide-react";

type Skill = {
  id: string;
  name: string;
  category: string;
  proficiency: string;
};

const CATEGORIES = ["Business Analysis", "Technical", "Tools", "Other"];
const PROFICIENCIES = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function SkillsTab() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [newSkill, setNewSkill] = useState({
    name: "",
    category: "Business Analysis",
    proficiency: "Intermediate"
  });

  useEffect(() => {
    async function fetchSkills() {
      if (!user) return;
      try {
        const q = query(collection(db, "skills"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const loadedSkills = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skill));
        setSkills(loadedSkills);
      } catch (err) {
        console.error("Failed to fetch skills", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [user]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSkill.name.trim()) return;
    setAdding(true);
    try {
      const docRef = await addDoc(collection(db, "skills"), {
        userId: user.uid,
        name: newSkill.name.trim(),
        category: newSkill.category,
        proficiency: newSkill.proficiency,
        createdAt: new Date().toISOString()
      });
      setSkills([...skills, { id: docRef.id, name: newSkill.name.trim(), category: newSkill.category, proficiency: newSkill.proficiency }]);
      setNewSkill({ name: "", category: "Business Analysis", proficiency: "Intermediate" });
    } catch (err) {
      console.error("Failed to add skill", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSkill = async (id: string) => {
    try {
      await deleteDoc(doc(db, "skills", id));
      setSkills(skills.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to remove skill", err);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-8 text-center">Loading skills...</div>;
  }

  const groupedSkills = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = skills.filter(s => s.category === cat);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Core skills</h2>
        <p className="mt-1 text-sm text-muted-foreground">These help JobPilot tailor your resume and recommendations.</p>
        
        <form onSubmit={handleAddSkill} className="mt-6 flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-md border border-border/50">
          <div className="flex-1 w-full grid gap-2">
            <Label>Skill Name</Label>
            <Input
              required
              placeholder="e.g. Requirement Gathering"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
            />
          </div>
          <div className="w-full md:w-48 grid gap-2">
            <Label>Category</Label>
            <Select value={newSkill.category} onValueChange={(val) => setNewSkill({ ...newSkill, category: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-40 grid gap-2">
            <Label>Proficiency</Label>
            <Select value={newSkill.proficiency} onValueChange={(val) => setNewSkill({ ...newSkill, proficiency: val })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFICIENCIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={adding} className="w-full md:w-auto">
            {adding ? "Adding..." : "Add"}
          </Button>
        </form>
      </section>

      <div className="space-y-6">
        {CATEGORIES.map(category => {
          const categorySkills = groupedSkills[category];
          if (categorySkills.length === 0) return null;

          return (
            <section key={category} className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display text-base font-semibold border-b border-border pb-3 mb-4">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {categorySkills.map(skill => (
                  <div key={skill.id} className="group relative flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-medium hover:border-primary/50 transition-colors">
                    <span className="flex flex-col">
                      <span>{skill.name}</span>
                      <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{skill.proficiency}</span>
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-5 ml-1 opacity-50 hover:opacity-100 hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => handleRemoveSkill(skill.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {skills.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
            No skills added yet. Use the form above to add your first skill.
          </div>
        )}
      </div>
    </div>
  );
}
