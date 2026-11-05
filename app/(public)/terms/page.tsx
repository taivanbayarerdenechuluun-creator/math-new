import Link from "next/link";
import { Logo } from "@/components/navigation/logo";

export const metadata = { title: "Үйлчилгээний нөхцөл" };

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Logo />
      <h1 className="mt-8 font-display text-3xl font-semibold">Үйлчилгээний нөхцөл</h1>
      <p className="mt-2 text-sm text-subtle">Товч хувилбар. Албан ёсоор нийтлэхээс өмнө хуулийн зөвлөхөөр хянуулна уу.</p>
      <div className="math-prose mt-6 text-muted">
        <h2>Зорилго</h2>
        <p>IQ MATH нь математикийг ойлгож суралцахад туслах боловсролын хэрэгсэл юм. Бодогч болон AI багшийг гэрийн даалгавраа хуулах бус, ойлгох зорилгоор ашиглана уу.</p>
        <h2>AI-ийн хязгаарлалт</h2>
        <p>AI-ийн тайлбар алдаатай байж болно. &quot;Шалгагдаагүй&quot; гэж тэмдэглэгдсэн хариуг багш эсвэл сурах бичгээрээ нягтална уу. Шалгалтын бэлэн байдлын үзүүлэлт нь тооцоолол бөгөөд үр дүнг баталгаажуулахгүй.</p>
        <h2>Хэрэглэгчийн хариуцлага</h2>
        <ul>
          <li>Бүртгэлийн нууц үгээ бусдад дамжуулахгүй байх</li>
          <li>Бусдын зохиогчийн эрхийг зөрчсөн материал оруулахгүй байх</li>
          <li>Системийг зориулалтын бусаар ашиглахгүй байх</li>
        </ul>
      </div>
      <Link href="/" className="mt-8 inline-block font-semibold text-primary">← Нүүр хуудас</Link>
    </div>
  );
}
