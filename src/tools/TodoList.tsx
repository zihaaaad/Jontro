import { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Task { id: string; text: string; completed: boolean; urgency?: number; }

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('jontro-todos');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Corrupted/incompatible localStorage data - reset rather than crash the app.
      return [];
    }
  });
  const [newTask, setNewTask] = useState('');

  useEffect(() => localStorage.setItem('jontro-todos', JSON.stringify(tasks)), [tasks]);

  // ALGORITHMIC NLP URGENCY DETECTOR
  const getUrgencyScore = (text: string) => {
    const lower = text.toLowerCase();
    let score = 0;
    if (lower.match(/\b(urgent|asap|now|immediate)\b/)) score += 100;
    if (lower.match(/\b(important|critical|high)\b/)) score += 50;
    if (lower.match(/\b(today|tonight)\b/)) score += 20;
    if (lower.match(/\b(tomorrow)\b/)) score += 10;
    return score;
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    const newTaskObj = { id: crypto.randomUUID(), text: newTask.trim(), completed: false, urgency: getUrgencyScore(newTask) };
    
    setTasks(prev => {
      const updated = [newTaskObj, ...prev];
      return updated.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        // @ts-ignore
        return (b.urgency || 0) - (a.urgency || 0);
      });
    });
    
    setNewTask('');
    toast.success('Task created & algorithmically sorted');
  };

  const toggleTask = (id: string) => setTasks(prev => {
    const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    return updated.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // @ts-ignore
      return (b.urgency || 0) - (a.urgency || 0);
    });
  });

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.error('Task removed');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-zinc-900 dark:text-[#ededed]">Task Manager</h2>
        <p className="text-sm text-zinc-500 dark:text-[#a3a3a3] mt-1">Organize your daily utility workflows.</p>
      </div>

      <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-[#262626] rounded-md overflow-hidden max-w-2xl flex flex-col flex-1 min-h-[400px]">
        {/* Input Area */}
        <div className="p-4 border-b border-zinc-200 dark:border-[#262626] bg-zinc-50 dark:bg-[#141414]">
          <form onSubmit={addTask} className="flex gap-3">
            <input 
              type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-white dark:bg-[#0e0e0e] border border-zinc-300 dark:border-[#404040] text-zinc-900 dark:text-[#ededed] text-sm rounded-md px-3 py-2 focus:outline-none focus:border-zinc-500 dark:focus:border-[#838383]"
            />
            <button type="submit" disabled={!newTask.trim()} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-[#ededed] dark:hover:bg-white text-white dark:text-[#0e0e0e] disabled:opacity-50 text-sm font-medium rounded-md flex items-center">
              <Plus size={16} className="mr-1" /> Add
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0e0e0e]">
          {tasks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500 dark:text-[#838383]">No pending tasks.</div>
          ) : (
            <div className="space-y-1">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-md hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] border border-transparent hover:border-zinc-200 dark:hover:border-[#262626] group">
                  <label className="flex items-center flex-1 cursor-pointer">
                    {/* Bug fix: bg-white for light mode checkbox so it doesn't look invisible */}
                    <input 
                      type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)}
                      className="w-4 h-4 rounded-sm border border-zinc-300 dark:border-[#555] bg-white dark:bg-transparent checked:bg-blue-500 dark:checked:bg-blue-500 checked:border-blue-500 appearance-none flex-shrink-0 relative before:content-[''] before:absolute before:inset-0 before:m-auto before:w-2 before:h-2 before:bg-white before:scale-0 checked:before:scale-100 before:transition-none"
                    />
                    <span className={`ml-3 text-sm flex items-center ${task.completed ? 'text-zinc-500 dark:text-[#838383] line-through' : 'text-zinc-700 dark:text-[#ededed]'}`}>
                      {task.text}
                      {/* @ts-ignore */}
                      {task.urgency >= 100 && !task.completed && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50 uppercase tracking-wider">Urgent</span>
                      )}
                      {/* @ts-ignore */}
                      {task.urgency >= 50 && task.urgency < 100 && !task.completed && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 uppercase tracking-wider">High Priority</span>
                      )}
                    </span>
                  </label>
                  <button onClick={() => deleteTask(task.id)} className="ml-4 p-1.5 text-zinc-500 dark:text-[#838383] hover:text-red-500 dark:hover:text-[#ededed] opacity-0 group-hover:opacity-100 transition-none active:scale-95">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
