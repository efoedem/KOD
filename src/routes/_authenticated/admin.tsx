import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Download } from "lucide-react";
import {
  adminOverview,
  addAdmin,
  deleteRecord,
  saveBook,
  saveDepartment,
  saveSchool,
} from "@/lib/admin.functions";
import { LEVELS, cedis, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { exportPaidOrders } from "@/lib/admin-export";
import { TelegramAdmin } from "@/components/telegram-admin";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BookMarket Ghana" },
      { name: "description", content: "Manage schools, departments, books and orders." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Admin — BookMarket Ghana" },
      { property: "og:description", content: "Manage schools, departments, books and orders." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const load = useServerFn(adminOverview);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => load(),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is for BookMarket staff accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="paper-grain min-h-[70vh]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{data.isSuper ? "Super admin" : "Admin dashboard"}</h1>
        <div className="mt-6 grid grid-cols-1 gap-4 border-y border-border py-5 sm:grid-cols-3">
          {[['Total orders',data.summary.totalOrders],['Paid orders',data.summary.paidOrders],['Amount paid',cedis(data.summary.amountPaid)]].map(([label,value])=><div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
        </div>

        <Tabs defaultValue="orders" className="mt-6">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="books">Books ({data.books.length})</TabsTrigger>
            {data.isSuper && <><TabsTrigger value="schools">Schools ({data.schools.length})</TabsTrigger><TabsTrigger value="departments">Departments ({data.departments.length})</TabsTrigger><TabsTrigger value="admins">Admins ({data.admins.length})</TabsTrigger></>}
            <TabsTrigger value="orders">Orders ({data.orders.length})</TabsTrigger>
            {data.isSuper && <TabsTrigger value="telegram">Telegram</TabsTrigger>}
          </TabsList>

          <TabsContent value="books" className="mt-6">
            <BooksTab data={data} onDone={refresh} />
          </TabsContent>
          {data.isSuper && <TabsContent value="telegram" className="mt-6"><TelegramAdmin /></TabsContent>}
          {data.isSuper && <TabsContent value="admins" className="mt-6"><AdminsTab data={data} onDone={refresh} /></TabsContent>}
          <TabsContent value="schools" className="mt-6">
            <SchoolsTab data={data} onDone={refresh} />
          </TabsContent>
          <TabsContent value="departments" className="mt-6">
            <DepartmentsTab data={data} onDone={refresh} />
          </TabsContent>
          <TabsContent value="orders" className="mt-6">
            <OrdersTab data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type Overview = Awaited<ReturnType<typeof adminOverview>>;

function useRemove(onDone: () => void) {
  const remove = useServerFn(deleteRecord);
  return useMutation({
    mutationFn: (input: { table: "schools" | "departments" | "books"; id: string }) =>
      remove({ data: input }),
    onSuccess: () => {
      toast.success("Removed");
      onDone();
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });
}

function SchoolsTab({ data, onDone }: { data: Overview; onDone: () => void }) {
  const save = useServerFn(saveSchool);
  const [form, setForm] = useState({ name: "", code: "" });
  const remove = useRemove(onDone);
  const mutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("School saved");
      setForm({ name: "", code: "" });
      onDone();
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form
        className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Add a school</h2>
        <div className="space-y-2">
          <Label htmlFor="schoolName">Name</Label>
          <Input
            id="schoolName"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="University of Ghana"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schoolCode">Short code</Label>
          <Input
            id="schoolCode"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
            placeholder="UG"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save school
        </Button>
      </form>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {data.schools.map((school) => (
          <div key={school.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{school.name}</p>
              <p className="text-sm text-muted-foreground">{school.code ?? "—"}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remove ${school.name}`}
              onClick={() => remove.mutate({ table: "schools", id: school.id })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentsTab({ data, onDone }: { data: Overview; onDone: () => void }) {
  const save = useServerFn(saveDepartment);
  const [form, setForm] = useState({ name: "", schoolId: "" });
  const remove = useRemove(onDone);
  const mutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Department saved");
      setForm({ name: "", schoolId: form.schoolId });
      onDone();
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form
        className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Add a department</h2>
        <div className="space-y-2">
          <Label>School</Label>
          <Select value={form.schoolId} onValueChange={(value) => setForm({ ...form, schoolId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select school" />
            </SelectTrigger>
            <SelectContent>
              {data.schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="departmentName">Name</Label>
          <Input
            id="departmentName"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Computer Science"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save department
        </Button>
      </form>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {data.departments.map((department) => (
          <div key={department.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{department.name}</p>
              <p className="text-sm text-muted-foreground">
                {data.schools.find((school) => school.id === department.school_id)?.name ?? "—"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remove ${department.name}`}
              onClick={() => remove.mutate({ table: "departments", id: department.id })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyBook = {
  id: undefined as string | undefined,
  schoolId: "",
  isActive: true,
  title: "",
  author: "",
  departmentId: "",
  level: "",
  price: "",
  stock: "25",
  courseCode: "",
  edition: "",
  description: "",
  coverUrl: "",
};

function BooksTab({ data, onDone }: { data: Overview; onDone: () => void }) {
  const save = useServerFn(saveBook);
  const [form, setForm] = useState(emptyBook);
  const remove = useRemove(onDone);
  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...form,
          price: Number(form.price),
          stock: Number(form.stock),
        },
      }),
    onSuccess: () => {
      toast.success("Book saved");
      setForm({ ...emptyBook, schoolId: form.schoolId, departmentId: form.departmentId, level: form.level });
      onDone();
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        className="h-fit space-y-4 rounded-xl border border-border bg-card p-5 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <h2 className="font-display text-lg font-semibold">{form.id ? 'Edit book' : 'Add a book'}</h2>
        <div className="space-y-2"><Label>School</Label><Select value={form.schoolId} onValueChange={v=>setForm({...form,schoolId:v,departmentId:''})}><SelectTrigger aria-label="Book school"><SelectValue placeholder="Select school" /></SelectTrigger><SelectContent>{data.schools.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2">
          <Label htmlFor="bookTitle">Title</Label>
          <Input
            id="bookTitle"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookAuthor">Author</Label>
          <Input
            id="bookAuthor"
            value={form.author}
            onChange={(event) => setForm({ ...form, author: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={form.departmentId}
            onValueChange={(value) => setForm({ ...form, departmentId: value })}
          >
            <SelectTrigger aria-label="Book department">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {data.departments.filter(d=>d.school_id===form.schoolId).map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name} ·{" "}
                  {data.schools.find((school) => school.id === department.school_id)?.code ?? ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={form.level} onValueChange={(value) => setForm({ ...form, level: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookCourse">Course code</Label>
            <Input
              id="bookCourse"
              value={form.courseCode}
              onChange={(event) => setForm({ ...form, courseCode: event.target.value })}
              placeholder="CSM 101"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="bookPrice">Price (GH₵)</Label>
            <Input
              id="bookPrice"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              placeholder="120"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookStock">Stock</Label>
            <Input
              id="bookStock"
              inputMode="numeric"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookCover">Cover image link (optional)</Label>
          <Input
            id="bookCover"
            value={form.coverUrl}
            onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookDescription">Description (optional)</Label>
          <Textarea
            id="bookDescription"
            rows={3}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <div className="flex items-center gap-2"><Checkbox id="bookActive" checked={form.isActive} onCheckedChange={v=>setForm({...form,isActive:v===true})} /><Label htmlFor="bookActive">Available to students</Label></div>
        <Button type="submit" className="w-full gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {form.id ? "Save changes" : "Save book"}
        </Button>
        {form.id && <Button type="button" variant="outline" onClick={()=>setForm(emptyBook)}>Cancel edit</Button>}
      </form>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {data.books.map((book) => (
          <div key={book.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{book.title}</p>
              <p className="text-sm text-muted-foreground">
                {book.author} · Level {book.level} ·{" "}
                {data.departments.find((department) => department.id === book.department_id)?.name ?? "—"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-display font-semibold text-primary">{cedis(book.price)}</span>
              <Button size="icon" variant="ghost" aria-label={`Edit ${book.title}`} onClick={()=>setForm({id:book.id,schoolId:data.departments.find(d=>d.id===book.department_id)?.school_id||'',title:book.title,author:book.author,departmentId:book.department_id,level:book.level,price:String(book.price),stock:String(book.stock),courseCode:book.course_code||'',edition:book.edition||'',description:book.description||'',coverUrl:book.cover_url||'',isActive:book.is_active})}><Pencil className="size-4" /></Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${book.title}`}
                onClick={() => remove.mutate({ table: "books", id: book.id })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab({ data }: { data: Overview }) {
  const [selected,setSelected] = useState<string[]>([]);
  const paid = data.orders.filter(o=>o.payment_status==='PAID');
  const rows = paid.filter(o=>selected.includes(o.id));
  const download = async (format: 'csv' | 'xlsx') => { try { await exportPaidOrders(rows,format); } catch { toast.error('Could not download selected orders.'); } };
  return <div>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Checkbox aria-label="Select all paid orders" checked={paid.length>0 && rows.length===paid.length ? true : rows.length>0 ? 'indeterminate' : false} disabled={!paid.length} onCheckedChange={v=>setSelected(v===true?paid.map(o=>o.id):[])} />
      <span className="text-sm">All paid · {rows.length} selected</span>
      <Button variant="outline" disabled={!rows.length} onClick={()=>download('csv')}><Download className="mr-2 size-4" />CSV</Button>
      <Button variant="outline" disabled={!rows.length} onClick={()=>download('xlsx')}><Download className="mr-2 size-4" />Excel</Button>
    </div>
    {!data.orders.length && <p className="py-12 text-center text-muted-foreground">No orders yet.</p>}
    <div className="divide-y divide-border">
      {data.orders.map(order=><div key={order.id} className="flex items-start gap-4 py-5">
        <Checkbox className="mt-1" aria-label={`Select ${order.order_ref}`} disabled={order.payment_status!=='PAID'} checked={selected.includes(order.id)} onCheckedChange={v=>setSelected(prev=>v===true?[...prev,order.id]:prev.filter(id=>id!==order.id))} />
        <div className="min-w-0 flex-1 space-y-1"><div className="flex flex-wrap gap-2"><p className="font-semibold">{order.order_ref}</p><Badge variant={order.payment_status==='PAID'?'default':'secondary'}>{order.payment_status==='PAID'?'Paid':'Unpaid'}</Badge></div>
          <p className="break-words text-sm">{order.buyer_name} · {order.phone} · {order.email}</p>
          <p className="text-sm text-muted-foreground">{order.school_name||'—'} · {order.department_name||'—'} · {formatDate(order.created_at)}</p>
          <p className="text-sm text-muted-foreground">{order.items.map(i=>`${i.title} × ${i.quantity}`).join(', ')}</p>
          <p className="font-semibold text-primary">{cedis(order.total)}</p>
        </div>
      </div>)}
    </div>
  </div>;
}

function AdminsTab({data,onDone}: {data:Overview;onDone:()=>void}) {
  const save=useServerFn(addAdmin);
  const empty={email:'',name:'',phone:'',schoolId:'',departmentId:''};
  const [form,setForm]=useState(empty);
  const mutation=useMutation({mutationFn:()=>save({data:form}),onSuccess:result=>{toast.success(result.status==='active'?'Admin access granted':'Admin reserved. They can create an account with this email.');setForm(empty);onDone();},onError:(e:Error)=>toast.error(e.message)});
  return <div className="space-y-8">
    <form className="max-w-2xl space-y-4" onSubmit={e=>{e.preventDefault();mutation.mutate();}}>
      <h2 className="text-xl font-semibold">Add an admin</h2>
      <div className="grid gap-4 sm:grid-cols-2">{(['email','name','phone'] as const).map(key=><div key={key} className="space-y-2"><Label htmlFor={`admin-${key}`}>{key==='email'?'Email':key==='name'?'Name (optional)':'Phone (optional)'}</Label><Input id={`admin-${key}`} type={key==='email'?'email':'text'} required={key==='email'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} /></div>)}
      <div className="space-y-2"><Label>School (optional)</Label><Select value={form.schoolId} onValueChange={v=>setForm({...form,schoolId:v,departmentId:''})}><SelectTrigger aria-label="Admin school"><SelectValue placeholder="Select school" /></SelectTrigger><SelectContent>{data.schools.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Department (optional)</Label><Select value={form.departmentId} onValueChange={v=>setForm({...form,departmentId:v})}><SelectTrigger aria-label="Admin department"><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{data.departments.filter(d=>d.school_id===form.schoolId).map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div></div>
      <Button disabled={mutation.isPending}><Plus className="mr-2 size-4" />Add admin</Button>
    </form>
    <div className="divide-y divide-border">{data.admins.map(a=><article key={a.id} className="py-5"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{a.name}</h3><Badge variant={a.pending?'secondary':'default'}>{a.pending?'Awaiting account':'Active admin'}</Badge></div><p className="mt-1 break-words text-sm">{a.email} · {a.phone}</p><p className="text-sm text-muted-foreground">{data.schools.find(s=>s.id===a.schoolId)?.name||'—'} · {data.departments.find(d=>d.id===a.departmentId)?.name||'—'}</p><div className="mt-3 flex flex-wrap gap-6 text-sm"><span>{a.bookCount} books uploaded</span><span>{a.totalOrders} orders · {a.paidOrders} paid</span><span className="font-semibold text-primary">{cedis(a.amountPaid)} paid</span></div></article>)}</div>
  </div>;
}
