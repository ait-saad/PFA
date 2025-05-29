import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import faqs from '../Data/faq.json';
const LandingPage = () => {
  return (
    <main className="flex flex-col gap-10 sm:gap-20 py-10 sm:py-20">
      <section className="text-center">
        <h1 className="flex flex-col items-center justify-center gradient-title text-4xl sm:text-6xl lg:text-8xl font-extrabold text-white tracking-trighter py-4">
          Trouver votre emploi
          <img
            src="/src/components/public/logo.png"
            alt="Logo"
            className="h-14 sm:h-24 lg:h-32 mx-auto"
          />
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mt-4">
          Explorez les opportunités de carrière qui vous attendent ou trouvez les bons candidats.
        </p>
      </section>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center">
        <Link to="/jobs">
          <Button variant="default" size="xl">Trouver un emploi</Button>
        </Link>
        <Link to="/jobs">
          <Button variant="secondary" size="xl">Trouver un candidat</Button>
        </Link>
      </div>
      
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card>
    <CardHeader>
      <CardTitle className="font-bold">Pour les chercheurs d'emploi</CardTitle>
    </CardHeader>
    <CardContent>
      Recherchez et postulez à des offres, suivez vos candidatures et bien plus.
    </CardContent>
  </Card>
  <Card>
    <CardHeader>
      <CardTitle className="font-bold">Pour les employeurs</CardTitle>
    </CardHeader>
    <CardContent>
      Publiez des offres, gérez les candidatures et trouvez les meilleurs talents.
    </CardContent>
  </Card>
</section>


       
<Accordion type="multiple" className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index + 1}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </main>
  );
};
export default LandingPage;
