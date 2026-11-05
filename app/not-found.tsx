import { LinkButton } from "@/components/ui/primitives";
import { Tex } from "@/components/mathematics/math-text";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <div className="text-3xl text-primary"><Tex tex="\lim_{x \to 404} f(x) = \varnothing" /></div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Хуудас олдсонгүй</h1>
        <p className="mt-2 text-muted">Таны хайсан хуудас байхгүй эсвэл танд үзэх эрх алга.</p>
        <LinkButton href="/" className="mt-6">Нүүр хуудас руу буцах</LinkButton>
      </div>
    </div>
  );
}
