import useEmblaCarousel from "embla-carousel-react";
import {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
} from "react";
import { cn } from "@/lib/cn";

type HorizontalDragScrollerProps = {
  children: ReactNode;
  className?: string;
  /** Label for assistive tech (e.g. "Upcoming activities") */
  ariaLabel: string;
  /** Width of each slide (Tailwind classes on the slide wrapper) */
  slideClassName: string;
};

/**
 * Embla-powered horizontal strip: free momentum scrolling (no snap-to-slide, no containment “pull”).
 *
 * Touch: Embla only captures the gesture when horizontal movement exceeds vertical on the first move;
 * otherwise it releases so the page can scroll vertically (native body scroll).
 */
export function HorizontalDragScroller({
  children,
  className,
  ariaLabel,
  slideClassName,
}: HorizontalDragScrollerProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    align: "start",
    /** No scroll containment — avoids the elastic trim at the ends. */
    containScroll: false,
    /** Free scroll with deceleration instead of snapping to each slide. */
    dragFree: true,
    /** Slightly higher so tiny jitters don’t lock into horizontal drag on touch. */
    dragThreshold: 12,
    duration: 25,
    skipSnaps: true,
    loop: false,
    watchDrag: true,
    watchResize: true,
  });

  const slideCount = Children.count(children);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, slideCount]);

  return (
    <div className={cn("embla group relative", className)}>
      <div
        ref={emblaRef}
        className="cursor-grab overflow-hidden pb-1 outline-none active:cursor-grabbing"
        role="region"
        tabIndex={0}
        aria-label={ariaLabel}
      >
        <div className="embla__container flex gap-4 [backface-visibility:hidden] will-change-transform">
          {Children.map(children, (child, i) => {
            if (!isValidElement(child)) return null;
            return (
              <div
                className={cn(
                  "embla__slide min-w-0 shrink-0 [transform:translate3d(0,0,0)]",
                  slideClassName,
                )}
                key={child.key ?? `slide-${i}`}
              >
                {child}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
