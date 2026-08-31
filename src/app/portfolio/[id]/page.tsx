import type { Metadata } from "next";
import { createRequire } from "node:module";
import { notFound } from "next/navigation";
import { StorefrontImage } from "@/features/store/storefront-image";
import { StorefrontBreadcrumbs } from "@/features/store/storefront-breadcrumbs";
import { toPublicImageSrc } from "@/lib/client/image-src";
import { absoluteUrl, defaultOpenGraph } from "@/lib/site-seo";
import { SEO_COPY } from "@/lib/seo-copy";

const require = createRequire(import.meta.url);
const portfolioService = require("@/lib/server/services/portfolioService") as {
  getPublicProject: (id: number) => Promise<{
    id: number;
    title: string;
    description: string;
    coverImage: string;
    images: string[];
  } | null>;
};

type PortfolioItemPageProps = {
  params: Promise<{ id: string }>;
};

const loadProject = async (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return portfolioService.getPublicProject(id);
};

export async function generateMetadata({ params }: PortfolioItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) {
    return { title: SEO_COPY.portfolio.title };
  }
  const title = `${project.title} — наши работы`;
  const description =
    project.description.trim() || `Фото работы: ${project.title}. Салон Дверная Точка, Архангельск.`;
  const image = toPublicImageSrc(project.coverImage);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/portfolio/${project.id}`),
    },
    openGraph: {
      ...defaultOpenGraph(),
      title,
      description,
      url: absoluteUrl(`/portfolio/${project.id}`),
      ...(image ? { images: [{ url: image, alt: project.title }] } : {}),
    },
  };
}

export default async function PortfolioItemPage({ params }: PortfolioItemPageProps) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) notFound();

  const images = project.images.map((url) => toPublicImageSrc(url)).filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <StorefrontBreadcrumbs
        items={[
          { name: "Главная", href: "/" },
          { name: "Портфолио", href: "/portfolio" },
          { name: project.title },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{project.title}</h1>
      {project.description ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
          {project.description}
        </p>
      ) : null}
      <div className="mt-6 space-y-4">
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-100">
            <StorefrontImage
              src={src}
              alt={`${project.title} — фото ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority={index === 0}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
